import { KV } from "@nats-io/kv";
import { assign, createActor, setup } from "xstate";
import { useEffect, useState } from "react";

interface UsePersistedMachineOptions {
  kv: KV;
  key: string;
}

export const editorMachine = setup({
  types: {
    events: {} as
      | {
          type: "FOCUS";
        }
      | {
          type: "BLUR";
        }
      | {
          type: "INPUT_CHANGE";
          text: string;
        },
    context: {} as {
      text: string;
    },
  },
}).createMachine({
  id: "editor",
  initial: "idle",
  context: {
    text: "",
  },
  states: {
    idle: {
      on: {
        FOCUS: "editing",
      },
    },
    editing: {
      on: {
        BLUR: "idle",
        INPUT_CHANGE: {
          actions: assign({
            text: ({ event }) => event.text,
          }),
        },
      },
    },
  },
});

export function usePersistedMachine(
  machine: typeof editorMachine,
  { kv, key }: UsePersistedMachineOptions,
) {
  const [actor, setActor] = useState(() => createActor(machine));
  const [state, setState] = useState(actor.getSnapshot());

  useEffect(() => {
    actor.start();

    kv.get(key).then((entry) => {
      if (entry) {
        const persistedSnapshot = JSON.parse(entry.string());
        const newActor = createActor(machine, {
          snapshot: persistedSnapshot,
        });
        newActor.start();
        setActor(newActor);
        setState(newActor.getSnapshot());
      }
    });

    const watchPromise = (async () => {
      const watch = await kv.watch({
        key,
      });

      for await (const entry of watch) {
        if (entry) {
          const persistedSnapshot = JSON.parse(entry.string());
          const newActor = createActor(machine, {
            snapshot: persistedSnapshot,
          });
          newActor.start();
          setActor(newActor);
          setState(newActor.getSnapshot());
        }
      }
    })();

    return () => {
      actor.stop();
      watchPromise.then((promise) => promise?.cancel?.());
    };
  }, [kv, key, machine]);

  useEffect(() => {
    const subscription = actor.subscribe((snapshot) => {
      const persistedSnapshot = actor.getPersistedSnapshot();
      kv.put(key, JSON.stringify(persistedSnapshot));
      setState(snapshot);
    });

    return subscription.unsubscribe;
  }, [actor, kv, key]);

  return {
    state,
    send: actor.send,
  };
}
