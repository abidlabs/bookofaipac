import {
  documentDirectory,
  deleteAsync,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

const FILE_NAME = "onboarding_v1.txt";

function onboardingFileUri(): string | null {
  if (!documentDirectory) return null;
  return `${documentDirectory}${FILE_NAME}`;
}

export async function getOnboardingComplete(): Promise<boolean> {
  const uri = onboardingFileUri();
  if (!uri) return false;
  try {
    const info = await getInfoAsync(uri);
    if (!info.exists) return false;
    const v = await readAsStringAsync(uri);
    return v.trim() === "1";
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  const uri = onboardingFileUri();
  if (!uri) return;
  await writeAsStringAsync(uri, "1");
}

export async function clearOnboardingComplete(): Promise<void> {
  const uri = onboardingFileUri();
  if (!uri) return;
  try {
    const info = await getInfoAsync(uri);
    if (info.exists) await deleteAsync(uri);
  } catch {
    return;
  }
}
