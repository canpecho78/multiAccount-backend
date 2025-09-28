import { initAuthCreds, type SignalDataTypeMap } from "@whiskeysockets/baileys";
import { AuthState } from "../models/AuthState";
import { AuthKey } from "../models/AuthKey";

export async function useMongoAuthState(sessionId: string) {
  // Load or initialize creds
  let auth = await AuthState.findOne({ sessionId });
  let creds = auth?.creds as any;
  if (!creds) {
    creds = initAuthCreds();
    await AuthState.findOneAndUpdate(
      { sessionId },
      { sessionId, creds, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }

  const writeKey = async (type: keyof SignalDataTypeMap, id: string, value: any) => {
    await AuthKey.findOneAndUpdate(
      { sessionId, type, id },
      { sessionId, type, id, value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  };

  const readKeys = async (type: keyof SignalDataTypeMap, ids: string[]) => {
    const result: { [key: string]: any } = {};
    if (!ids?.length) return result;

    const docs = await AuthKey.find({ sessionId, type, id: { $in: ids } });
    for (const doc of docs) {
      result[doc.id] = doc.value;
    }
    return result;
  };

  const delKeys = async (type: keyof SignalDataTypeMap, ids: string[]) => {
    if (!ids?.length) return;
    await AuthKey.deleteMany({ sessionId, type, id: { $in: ids } });
  };

  const state = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        return readKeys(type, ids);
      },
      set: async (data: any) => {
        const tasks: Promise<any>[] = [];
        for (const type of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          const entries = data[type];
          for (const id of Object.keys(entries)) {
            const value = entries[id];
            tasks.push(writeKey(type, id, value));
          }
        }
        await Promise.all(tasks);
      },
      // Optional: clear support
      clear: async () => {
        await AuthKey.deleteMany({ sessionId });
      },
      // Optional: delete specific keys
      remove: async (type: keyof SignalDataTypeMap, ids: string[]) => {
        await delKeys(type, ids);
      },
    },
  } as any;

  const saveCreds = async () => {
    await AuthState.findOneAndUpdate(
      { sessionId },
      { sessionId, creds: state.creds, updatedAt: new Date() },
      { upsert: true }
    );
  };

  return { state, saveCreds };
}
