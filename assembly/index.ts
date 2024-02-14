import { System, Protobuf, authority } from "@koinos/sdk-as";
import { Staking as ContractClass } from "./Staking";
import { staking as ProtoNamespace } from "./proto/staking";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {
    case 0x5c137711: {
      const args = Protobuf.decode<ProtoNamespace.get_pool_arguments>(
        contractArgs.args,
        ProtoNamespace.get_pool_arguments.decode
      );
      const res = c.get_pool(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.pool_object.encode);
      break;
    }

    case 0x5c721497: {
      const args = Protobuf.decode<ProtoNamespace.balance_of_arguments>(
        contractArgs.args,
        ProtoNamespace.balance_of_arguments.decode
      );
      const res = c.balance_of(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.balance_object.encode);
      break;
    }

    case 0x470ebe82: {
      const args = Protobuf.decode<ProtoNamespace.initialize_arguments>(
        contractArgs.args,
        ProtoNamespace.initialize_arguments.decode
      );
      const res = c.initialize(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.empty_object.encode);
      break;
    }

    case 0x2937013f: {
      const args = Protobuf.decode<ProtoNamespace.update_arguments>(
        contractArgs.args,
        ProtoNamespace.update_arguments.decode
      );
      const res = c.update(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.empty_object.encode);
      break;
    }

    case 0xf9d54899: {
      const args = Protobuf.decode<ProtoNamespace.emergency_withdraw_arguments>(
        contractArgs.args,
        ProtoNamespace.emergency_withdraw_arguments.decode
      );
      const res = c.emergency_withdraw(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.empty_object.encode);
      break;
    }

    case 0xc3b9fb78: {
      const args = Protobuf.decode<ProtoNamespace.deposit_arguments>(
        contractArgs.args,
        ProtoNamespace.deposit_arguments.decode
      );
      const res = c.deposit(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.empty_object.encode);
      break;
    }

    case 0xc26f22db: {
      const args = Protobuf.decode<ProtoNamespace.withdraw_arguments>(
        contractArgs.args,
        ProtoNamespace.withdraw_arguments.decode
      );
      const res = c.withdraw(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.empty_object.encode);
      break;
    }

    case 0x39a222b9: {
      const args =
        Protobuf.decode<ProtoNamespace.claim_pending_reward_arguments>(
          contractArgs.args,
          ProtoNamespace.claim_pending_reward_arguments.decode
        );
      const res = c.claim_pending_reward(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.empty_object.encode);
      break;
    }

    case 0xb044cb9d: {
      const args = Protobuf.decode<ProtoNamespace.get_pending_reward_arguments>(
        contractArgs.args,
        ProtoNamespace.get_pending_reward_arguments.decode
      );
      const res = c.get_pending_reward(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.uint64.encode);
      break;
    }

    default:
      System.exit(1);
      break;
  }

  System.exit(0, retbuf);
  return 0;
}

main();
