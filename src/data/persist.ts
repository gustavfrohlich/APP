// Tartós tárolás kérése, hogy a böngésző ne törölje magától az adatokat.

export async function requestPersistence(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return undefined;
  }
}

export async function isPersisted(): Promise<boolean | undefined> {
  try {
    return navigator.storage?.persisted ? await navigator.storage.persisted() : undefined;
  } catch {
    return undefined;
  }
}
