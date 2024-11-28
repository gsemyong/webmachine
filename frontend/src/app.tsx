import { wsconnect } from "@nats-io/nats-core";
import {
  editorMachine,
  usePersistedMachine,
} from "./hooks/use-persisted-machine";
import { Kvm } from "@nats-io/kv";

const nc = await wsconnect({
  servers: "ws://localhost:8080",
});
const kvm = new Kvm(nc);
const kv = await kvm.create("mykv");

export function App() {
  const { send, state } = usePersistedMachine(editorMachine, {
    kv,
    key: "state",
  });

  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 bg-neutral-950 p-4 text-white">
      <textarea
        value={state.context.text}
        onFocus={() => send({ type: "FOCUS" })}
        onBlur={() => send({ type: "BLUR" })}
        onChange={(e) => send({ type: "INPUT_CHANGE", text: e.target.value })}
        className="w-full rounded-md bg-neutral-800 p-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      />
      <div className="text-sm text-neutral-500">
        {state.value === "editing" ? "editing" : "idle"}
      </div>
    </div>
  );
}
