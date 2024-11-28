import { Kvm } from "@nats-io/kv";
import { connect } from "@nats-io/transport-node";
import { faker } from "@faker-js/faker";

const nc = await connect();
const kvm = new Kvm(nc);
const kv = await kvm.create("mykv");

setInterval(() => {
  kv.put("test", faker.animal.petName());
}, 2000);
