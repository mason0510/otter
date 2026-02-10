/// Otter Intent Agent Authorization Module
/// 允许用户授权 Intent Agent 在额度内免签执行交易

module authorization::auth {
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
    const ENOT_OWNER: u64 = 5;           // 不是所有者

    /// 授权对象（Shared Object）
    struct Authorization has key {
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

    /// 授权记录
    struct AuthRecord has key {
        id: UID,
        owner: address,
        agent: address,
        amount: u64,
        timestamp: u64,
    }

    /// 授权创建事件
    struct AuthCreated has copy, drop {
        owner: address,
        daily_limit: u64,
        per_tx_limit: u64,
        expiry: u64,
    }

    /// 授权使用事件
    struct AuthUsed has copy, drop {
        owner: address,
        amount: u64,
        used_today: u64,
        timestamp: u64,
    }

    /// 创建授权
    public entry fun create_authorization(
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

        transfer::share_object(auth);

        event::emit(AuthCreated {
            owner,
            daily_limit,
            per_tx_limit,
            expiry,
        });
    }

    /// 使用授权执行转账
    public entry fun execute_with_auth(
        auth: &mut Authorization,
        recipient: address,
        amount: u64,
        coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 1. 检查授权状态
        assert!(auth.enabled, EDISABLED);

        let now = clock::timestamp_ms(clock) / 1000;
        assert!(now <= auth.expiry, EEXPIRED);

        // 2. 检查单笔限额
        assert!(amount <= auth.per_tx_limit, EEXCEED_LIMIT);
        assert!(amount > 0, EINVALID_AMOUNT);

        // 3. 检查并重置每日额度
        let days_since_last_reset = (now - auth.last_reset) / (24 * 3600);
        if (days_since_last_reset > 0) {
            auth.used_today = 0;
            auth.last_reset = now;
        };

        // 4. 检查每日限额
        let new_used = auth.used_today + amount;
        assert!(new_used <= auth.daily_limit, EEXCEED_LIMIT);

        // 5. 执行转账（前端已经 split 好精确金额）
        transfer::public_transfer(coin, recipient);

        // 6. 更新已用额度
        auth.used_today = new_used;

        // 7. 发送事件
        event::emit(AuthUsed {
            owner: auth.owner,
            amount,
            used_today: auth.used_today,
            timestamp: now,
        });

        // 8. 创建审计记录
        let record = AuthRecord {
            id: object::new(ctx),
            owner: auth.owner,
            agent: auth.agent,
            amount,
            timestamp: now,
        };
        transfer::transfer(record, auth.owner);
    }

    /// 撤销授权
    public entry fun revoke_authorization(
        auth: Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), ENOT_OWNER);
        let Authorization { id, owner: _, agent: _, token_type: _, daily_limit: _, per_tx_limit: _, used_today: _, last_reset: _, expiry: _, enabled: _ } = auth;
        object::delete(id);
    }

    /// 禁用授权
    public entry fun disable_authorization(
        auth: &mut Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), ENOT_OWNER);
        auth.enabled = false;
    }

    /// 重新启用授权
    public entry fun enable_authorization(
        auth: &mut Authorization,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), ENOT_OWNER);
        auth.enabled = true;
    }

    /// 增加每日限额
    public entry fun increase_daily_limit(
        auth: &mut Authorization,
        additional: u64,
        ctx: &mut TxContext
    ) {
        assert!(auth.owner == tx_context::sender(ctx), ENOT_OWNER);
        auth.daily_limit = auth.daily_limit + additional;
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
}
