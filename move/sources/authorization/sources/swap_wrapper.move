/// Otter Swap Wrapper Module
/// 封装 DEX Swap 操作，支持授权模式执行
///
/// 工作流程：
/// 1. 用户预先创建授权对象 (authorization::auth::create_authorization)
/// 2. 用户调用此 Wrapper 执行 Swap，传入授权对象
/// 3. Wrapper 检查授权限额，执行 Swap，更新使用量
/// 4. 用户无需每次签名，一次授权多次使用

module authorization::swap_wrapper {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::object::UID;
    use std::string::{Self, String};
    use sui::event;

    // 导入 auth 模块（不导入 Authorization 以避免命名冲突）
    use authorization::auth;

    /// Swap 执行事件
    public struct SwapExecuted has copy, drop {
        owner: address,
        input_token: String,
        output_token: String,
        input_amount: u64,
        output_amount: u64,
        timestamp: u64,
    }

    /// 授权对象（已废弃，保留用于升级兼容性）
    /// 新代码请使用 authorization::auth::Authorization
    public struct Authorization has key, store {
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

    /// 使用授权执行 Swap（旧版本，已废弃）
    /// 保留用于升级兼容性，新代码请使用 execute_swap_with_auth_v2
    public fun execute_swap_with_auth(
        auth: &mut Authorization,
        input_coin: Coin<SUI>,
        _min_output: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock) / 1000;

        // 检查授权状态
        assert!(auth.enabled == true, 3);
        assert!(now <= auth.expiry, 2);
        assert!(auth.agent == tx_context::sender(ctx) || auth.owner == tx_context::sender(ctx), 0);

        // 获取输入金额
        let input_amount = coin::value(&input_coin);
        assert!(input_amount > 0, 4);
        assert!(input_amount <= auth.per_tx_limit, 1);

        // 检查并重置每日额度
        let days_since_last_reset = (now - auth.last_reset) / (24 * 3600);
        if (days_since_last_reset > 0) {
            auth.used_today = 0;
            auth.last_reset = now;
        };

        // 检查每日限额
        let new_used = auth.used_today + input_amount;
        assert!(new_used <= auth.daily_limit, 1);

        // 执行 Swap（暂时直接返回原 Coin）
        let output_coin = input_coin;

        // 更新授权使用量
        auth.used_today = new_used;

        // 转账输出 Coin 给调用者
        let output_amount = coin::value(&output_coin);
        transfer::public_transfer(output_coin, sender);

        // 发送事件
        event::emit(SwapExecuted {
            owner: auth.owner,
            input_token: auth.token_type,
            output_token: string::utf8(b"SUI"),
            input_amount,
            output_amount,
            timestamp: now,
        });
    }

    /// 使用授权执行 Swap（新版本，推荐）
    /// 使用统一的 authorization::auth::Authorization
    public fun execute_swap_with_auth_v2(
        auth: &mut authorization::auth::Authorization,
        input_coin: Coin<SUI>,
        _min_output: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock) / 1000;

        // 1. 验证调用者权限（owner 或 agent）
        auth::verify_caller(auth, sender);

        // 2. 获取输入金额
        let input_amount = coin::value(&input_coin);

        // 3. 检查授权并更新使用量（调用 friend 函数）
        auth::check_and_update_auth(auth, input_amount, now);

        // 4. 执行 Swap（这里需要集成实际 DEX）
        // 注意：这是简化版本，实际需要调用 Cetus swap_router
        // 暂时直接返回原 Coin（无实际 Swap）
        let output_coin = input_coin;

        // 5. 转账输出 Coin 给调用者
        let output_amount = coin::value(&output_coin);
        transfer::public_transfer(output_coin, sender);

        // 6. 发送事件
        event::emit(SwapExecuted {
            owner: auth::get_owner(auth),
            input_token: auth::get_token_type(auth),
            output_token: string::utf8(b"SUI"),
            input_amount,
            output_amount,
            timestamp: now,
        });
    }

    /// 创建测试用的授权对象（已废弃，保留用于升级兼容性）
    /// 新代码请使用 authorization::auth::create_authorization
    public fun create_test_authorization(
        agent: address,
        token_type: String,
        daily_limit: u64,
        per_tx_limit: u64,
        validity_days: u64,
        ctx: &mut TxContext
    ) {
        use sui::object;
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

    /// 查询授权状态（已废弃，保留用于升级兼容性）
    /// 新代码请使用 authorization::auth::get_auth_status
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

    /// 检查是否可以执行（已废弃，保留用于升级兼容性）
    /// 新代码请使用 authorization::auth::can_execute
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

    /// 禁用授权（已废弃，保留用于升级兼容性）
    /// 新代码请使用 authorization::auth::disable_authorization
    public fun disable_authorization(
        auth: &mut Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), 7);
        auth.enabled = false;
    }

    /// 重新启用授权（已废弃，保留用于升级兼容性）
    /// 新代码请使用 authorization::auth::enable_authorization
    public fun enable_authorization(
        auth: &mut Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), 7);
        auth.enabled = true;
    }

    /// 撤销授权（已废弃，保留用于升级兼容性）
    /// 新代码请使用 authorization::auth::revoke_authorization
    public fun revoke_authorization_internal(
        auth: &mut Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), 7);
        auth.enabled = false;
    }
}
