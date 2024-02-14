import { System, Storage, SafeMath, u128, authority, Token } from "@koinos/sdk-as";
import { staking } from "./proto/staking";
import { Spaces } from "./Spaces";
import { Constants } from "./Constants";

export class Staking {
  contractId: Uint8Array;

  // spaces
  pool: Storage.Obj<staking.pool_object>;
  supply: Storage.Obj<staking.uint64>;
  balances: Storage.Map<Uint8Array, staking.balance_object>;

  constructor() {
    this.contractId = System.getContractId();

    // config spaces
    this.pool = new Storage.Obj(
      this.contractId,
      Spaces.POOL_SPACE_ID,
      staking.pool_object.decode,
      staking.pool_object.encode,
      () => new staking.pool_object()
    );
    this.supply = new Storage.Obj(
      this.contractId,
      Spaces.SUPPLY_SPACE_ID,
      staking.uint64.decode,
      staking.uint64.encode,
      () => new staking.uint64(0)
    );
    this.balances = new Storage.Map(
      this.contractId,
      Spaces.BALACES_SPACE_ID,
      staking.balance_object.decode,
      staking.balance_object.encode,
      () => new staking.balance_object()
    );
  }

  get_pool(args: staking.get_pool_arguments): staking.pool_object {
    let pool = this.pool.get()!;
    return pool;
  }

  balance_of(args: staking.balance_of_arguments): staking.balance_object {
    let user = this.balances.get(args.owner)!;
    return user
  }

  initialize(args: staking.initialize_arguments): staking.empty_object {
    System.requireAuthority(authority.authorization_type.contract_call, this.contractId);
    let pool = this.pool.get()!
    System.require(!pool.is_initialize, 'STAKING: INITIALIZED', 1);
    System.require(args.block_start < args.block_end, 'STAKING: BAD_INPUT_BLOCKS', 1);
    // update info pool
    pool.token_deposit = args.token_deposit;
    pool.token_reward = args.token_reward;
    pool.block_reward = args.block_reward;
    pool.block_start = args.block_start;
    pool.block_end = args.block_end;
    pool.last_reward_block = args.block_start;
    pool.is_active = true;
    pool.is_initialize = true;
    // save pool
    this.pool.put(pool);
    return new staking.empty_object();
  }

  update(args: staking.update_arguments): staking.empty_object {
    System.requireAuthority(authority.authorization_type.contract_call, this.contractId);
    let pool = this.pool.get()!
    // get block
    let block_height_field = System.getBlockField('header.height')!;
    System.require(block_height_field != null, 'The block height cannot be null', 1);
    const head_block = block_height_field.uint64_value as u64;
    // checks
    System.require(pool.block_start < head_block, "STAKING: POOL_START", 1);
    System.require(args.block_start < args.block_end, "STAKING: BAD_POOL_ENDED", 1);
    System.require(args.block_start > head_block, "STAKING: BAD_POOL_STARTED", 1);
    // set new configs
    pool.block_start = args.block_start;
    pool.block_end = args.block_end;
    pool.block_reward = args.block_reward;
    pool.last_reward_block = args.block_start; // Set the lastRewardBlock as the startBlock
    // save pool
    this.pool.put(pool);
    return new staking.empty_object();
  }

  deposit(args: staking.deposit_arguments): staking.empty_object {    
    let user = this.balances.get(args.from)!;
    let pool = this.update_pool(this.pool.get()!);
    let supply = this.supply.get()!;
    // u128
    let user_amount = u128.fromU64(user.value);
    let user_reward_debt = u128.fromU64(user.reward_debt);
    let pool_reward_per_share = u128.fromU64(pool.reward_per_share);
    if(user.value > 0) {
      let pending = SafeMath.sub( SafeMath.div(SafeMath.mul(user_amount, pool_reward_per_share), Constants.TOKEN_DECIMALS), user_reward_debt);
      if(pending > u128.Zero) {
        user.reward_debt = SafeMath.div(SafeMath.mul(user_amount, pool_reward_per_share), Constants.TOKEN_DECIMALS).toU64();
        // update data u128
        user_reward_debt = u128.fromU64(user.reward_debt);
        let tokenRewards = new Token(pool.token_deposit);
        System.require(tokenRewards.transfer(this.contractId, args.from, pending.toU64()), "STAKING: FAIL_REWARD_TRANSFER", 1);
      }
    }
    if(args.value > 0) {
      let tokenDeposit = new Token(pool.token_deposit);
      System.require(tokenDeposit.transfer(args.from, this.contractId, args.value), "STAKING: FAIL_DEPOSIT_TRANSFER", 1)

      // update value
      user.value += args.value
      supply.value += args.value;
      user_amount = u128.fromU64(user.value);
    }
    // update user data
    user.reward_debt = SafeMath.div( SafeMath.mul(user_amount, pool_reward_per_share), Constants.TOKEN_DECIMALS).toU64();
    // update state
    this.pool.put(pool);
    this.supply.put(supply);
    this.balances.put(args.from, user);
    return new staking.empty_object();
  }

  withdraw(args: staking.withdraw_arguments): staking.empty_object {
    let user = this.balances.get(args.from)!;
    let pool = this.update_pool(this.pool.get()!);
    let supply = this.supply.get()!;
    // u128
    let user_amount = u128.fromU64(user.value);
    let user_reward_debt = u128.fromU64(user.reward_debt);
    let pool_reward_per_share = u128.fromU64(pool.reward_per_share);
    let pending = SafeMath.sub(SafeMath.div(SafeMath.mul(user_amount, pool_reward_per_share), Constants.TOKEN_DECIMALS), user_reward_debt);
    if(pending > u128.Zero) {
      let tokenRewards = new Token(pool.token_reward);
      System.require(tokenRewards.transfer(this.contractId, args.from, pending.toU64()), "STAKING: FAIL_REWARD_TRANSFER", 1);
    }
    if(args.value > 0) {
      // update values
      user.value -= args.value;
      supply.value -= args.value;
      user_amount = u128.fromU64(user.value);
      // transfer
      let tokenDeposit = new Token(pool.token_deposit);
      System.require(tokenDeposit.transfer(this.contractId, args.from, args.value), "STAKING: FAIL_DEPOSIT_TRANSFER", 1);
    }
    // update user data
    user.reward_debt =  SafeMath.div(SafeMath.mul(user_amount, pool_reward_per_share), Constants.TOKEN_DECIMALS).toU64();
    // update state
    this.pool.put(pool);
    this.supply.put(supply);
    this.balances.put(args.from, user);
    return new staking.empty_object();
  }

  claim_pending_reward(args: staking.claim_pending_reward_arguments): staking.empty_object {
    let user = this.balances.get(args.from)!;
    let pool = this.update_pool(this.pool.get()!);
    let supply = this.supply.get()!;
    // check
    System.require(user.value > 0 , 'STAKING: NOT_BALANCE_IN_POOL', 1);
    // u128
    let user_amount = u128.fromU64(user.value);
    let user_reward_debt = u128.fromU64(user.reward_debt);
    let pool_reward_per_share = u128.fromU64(pool.reward_per_share);

    let pending = SafeMath.sub( SafeMath.div(SafeMath.mul(user_amount, pool_reward_per_share), Constants.TOKEN_DECIMALS), user_reward_debt);
    if(pending > u128.Zero) {
      user.reward_debt = SafeMath.div(SafeMath.mul(user_amount, pool_reward_per_share), Constants.TOKEN_DECIMALS).toU64();
      // transferRewards
      let tokenRewards = new Token(pool.token_reward);
      System.require(tokenRewards.transfer(this.contractId, args.from, pending.toU64()), "FAIL_REWARD_TRANSFER", 1);
    }
    // update state
    this.pool.put(pool);
    this.balances.put(args.from, user);
    return new staking.empty_object();
  }

  get_pending_reward(args: staking.get_pending_reward_arguments): staking.uint64 {
    let user = this.balances.get(args.owner)!;
    let pool = this.pool.get()!;
    // u128
    let user_amount = u128.fromU64(user.value);
    let user_reward_debt = u128.fromU64(user.reward_debt);
    let pool_reward_per_share = u128.fromU64(pool.reward_per_share);
    let pool_block_reward = u128.fromU64(pool.block_reward);
    // supply
    let supply_contract = this.supply.get()!;
    let supply = u128.fromU64( supply_contract.value );
    // get block
    let head_info = System.getHeadInfo();
    let head_block = head_info.head_topology!.height;
    if(head_block > pool.last_reward_block && supply != u128.Zero) {
      let multiplier = this.getMultiplier(pool, pool.last_reward_block, head_block);
      let reward = SafeMath.mul(u128.fromU64(multiplier), pool_block_reward);
      pool_reward_per_share = SafeMath.add(pool_reward_per_share, SafeMath.div(SafeMath.mul(reward, Constants.TOKEN_DECIMALS), supply) );
    }
    let accumulate = SafeMath.sub(SafeMath.div(SafeMath.mul( user_amount, pool_reward_per_share), Constants.TOKEN_DECIMALS), user_reward_debt)
    return new staking.uint64(accumulate.toU64());
  }


  private update_pool(pool: staking.pool_object): staking.pool_object {
    const block_height_field = System.getBlockField('header.height');
    System.require( block_height_field != null, 'The block height cannot be null', 1)
    const block_height = block_height_field!.uint64_value as u64;

    if( block_height < pool.last_reward_block ) {
      return pool;
    }
    let supply_contract = this.supply.get()!;
    let supply = u128.fromU64( supply_contract.value );

    if(supply == u128.Zero) {
      pool.last_reward_block = block_height;
      return pool;
    }
    // u128
    let pool_reward_per_share = u128.fromU64(pool.reward_per_share);
    let pool_block_reward = u128.fromU64(pool.block_reward)

    let multiplier = this.getMultiplier(pool, pool.last_reward_block, block_height);
    let reward = SafeMath.mul(u128.fromU64(multiplier), pool_block_reward);
    pool.reward_per_share = SafeMath.add(pool_reward_per_share, SafeMath.div( SafeMath.mul(reward, Constants.TOKEN_DECIMALS), supply) ).toU64();
    pool.last_reward_block = block_height;
    return pool;
  }
  
  private getMultiplier(pool: staking.pool_object, _from: u64, _to: u64): u64 {
    if (_to <= pool.block_end) {
      return SafeMath.sub(_to, _from)
    } else if( _from >= pool.block_end ) {
      return 0;
    } else {
      return SafeMath.sub(pool.block_end, _from);
    }
  }
}
