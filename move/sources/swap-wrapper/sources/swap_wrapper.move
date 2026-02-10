/// Otter Swap Wrapper Module
/// 封装 DEX Swap 操作，支持授权模式执行
///
/// 工作流程：
/// 1. 用户预先创建授权对象 (authorization::auth::create_authorization)
/// 2. 用户调用此 Wrapper 执行 Swap，传入授权对象
/// 3. Wrapper 检查授权限额，执行 Swap，更新使用量
/// 4. 用户无需每次签名，一次授权多次使用

module swap_wrapper::swap_wrapper {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use sui::event;

    /// 错误码
    const ENOT_AUTHORIZED: u64 = 0;      // 未授权
    const EEXCEED_LIMIT: u64 = 1;        // 超过限额
    const EEXPIRED: u64 = 2;             // 授权已过期
    const EDISABLED: u64 = 3;            // 授权已禁用
    const EINVALID_AMOUNT: u64 = 4;      // 无效金额
    const ENOT_OWNER: u64 = 7;           // 不是所有者

    /// 授权对象（内联定义，避免跨包依赖）
    struct Authorization has key, store {
        id: UID,
        owner: address,
        agent: address,
        token_type: String,
        daily_limit: u64,
        per_tx_limit: u64,
        used_today: u64,
        last_reset: u64,
        expiry: u64,
        enabled: bool,
    }

    /// Swap 执行事件
    struct SwapExecuted has copy, drop {
        owner: address,
        input_token: String,
        output_token: String,
        input_amount: u64,
        output_amount: u64,
        timestamp: u64,
    }

    /// 使用授权执行 Swap（简化版本）
    ///
    /// 注意：这是一个基础实现，需要集成实际的 DEX（如 Cetus）
    ///
    /// 参数：
    /// - auth: 授权对象（Shared Object）
    /// - input_coin: 输入代币 Coin
    /// - output_token_type: 输出代币类型
    /// - min_output: 最小输出量（滑点保护）
    /// - clock: Clock 对象
    /// - ctx: 交易上下文
    ///
    /// 返回：
    /// - 输出代币 Coin（转给调用者）
    public fun execute_swap_with_auth(
        auth: &mut Authorization,
        input_coin: Coin<SUI>,
        _min_output: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock) / 1000;

        // 1. 检查授权状态
        assert!(auth.enabled == true, EDISABLED);
        assert!(now <= auth.expiry, EEXPIRED);
        assert!(auth.agent == tx_context::sender(ctx) || auth.owner == tx_context::sender(ctx), ENOT_AUTHORIZED);

        // 2. 获取输入金额
        let input_amount = coin::value(&input_coin);
        assert!(input_amount > 0, EINVALID_AMOUNT);
        assert!(input_amount <= auth.per_tx_limit, EEXCEED_LIMIT);

        // 3. 检查并重置每日额度
        let days_since_last_reset = (now - auth.last_reset) / (24 * 3600);
        if (days_since_last_reset > 0) {
            auth.used_today = 0;
            auth.last_reset = now;
        };

        // 4. 检查每日限额
        let new_used = auth.used_today + input_amount;
        assert!(new_used <= auth.daily_limit, EEXCEED_LIMIT);

        // 5. 执行 Swap（这里需要集成实际 DEX）
        // 注意：这是简化版本，实际需要调用 Cetus swap_router
        // 暂时直接返回原 Coin（无实际 Swap）
        let output_coin = input_coin;

        // 6. 更新授权使用量
        auth.used_today = new_used;

        // 7. 转账输出 Coin 给调用者
        let output_amount = coin::value(&output_coin);
        transfer::public_transfer(output_coin, sender);

        // 8. 发送事件
        event::emit(SwapExecuted {
            owner: auth.owner,
            input_token: auth.token_type,
            output_token: string::utf8(b"SUI"),
            input_amount,
            output_amount,
            timestamp: now,
        });
    }

    /// 创建测试用的授权对象（仅用于测试）
    public entry fun create_test_authorization(
        agent: address,
        token_type: String,
        daily_limit: u64,
        per_tx_limit: u64,
        validity_days: u64,
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);
        let now = tx_context::epoch_timestamp_ms(ctx) / 1000;
        let expiry = now + (validity_days * 24 * 3600);

        let auth = Authorization {
            id: object::new(ctx),
            owner,
            agent,
            token_type,
            daily_limit,
            per_tx_limit,
            used_today: 0,
            last_reset: now,
            expiry,
            enabled: true,
        };

        transfer::public_share_object(auth);
    }

    /// 查询授权状态
    public fun get_auth_status(
        auth: &Authorization
    ): (bool, u64, u64, u64, u64, u64) {
        (
            auth.enabled,
            auth.daily_limit,
            auth.per_tx_limit,
            auth.used_today,
            auth.last_reset,
            auth.expiry,
        )
    }

    /// 检查是否可以执行
    public fun can_execute(
        auth: &Authorization,
        amount: u64,
        clock: &Clock
    ): bool {
        if (!auth.enabled) return false;

        let now = clock::timestamp_ms(clock) / 1000;
        if (now > auth.expiry) return false;
        if (amount > auth.per_tx_limit) return false;

        let days_since_last_reset = (now - auth.last_reset) / (24 * 3600);
        let used_today = if (days_since_last_reset > 0) 0 else auth.used_today;

        used_today + amount <= auth.daily_limit
    }

    /// 禁用授权
    public fun disable_authorization(
        auth: &mut Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), ENOT_OWNER);
        auth.enabled = false;
    }

    /// 重新启用授权
    public fun enable_authorization(
        auth: &mut Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), ENOT_OWNER);
        auth.enabled = true;
    }

    /// 撤销授权（禁用）
    public fun revoke_authorization_internal(
        auth: &mut Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), ENOT_OWNER);
        auth.enabled = false;
    }
}
