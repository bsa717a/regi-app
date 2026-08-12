import { Preferences } from "@capacitor/preferences";
import { isNativeApp } from "@/lib/capacitor/platform";

const ENABLED_KEY = "regi.biometric.lockEnabled";

export type BiometricAvailability = {
  available: boolean;
  label: string;
  reason?: string;
};

/** User-facing label for the device biometry (Face ID / Touch ID / Biometrics). */
export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (!isNativeApp()) {
    return { available: false, label: "Biometrics", reason: "Not a native app." };
  }

  try {
    const { NativeBiometric, BiometryType } = await import(
      "@capgo/capacitor-native-biometric"
    );
    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) {
      return {
        available: false,
        label: "Biometrics",
        reason: "Biometrics aren’t set up on this device.",
      };
    }

    let label = "Biometrics";
    if (result.biometryType === BiometryType.FACE_ID) label = "Face ID";
    else if (result.biometryType === BiometryType.TOUCH_ID) label = "Touch ID";
    else if (result.biometryType === BiometryType.FINGERPRINT) {
      label = "Fingerprint";
    }

    return { available: true, label };
  } catch {
    return {
      available: false,
      label: "Biometrics",
      reason: "Biometrics aren’t available right now.",
    };
  }
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const { value } = await Preferences.get({ key: ENABLED_KEY });
  return value === "1";
}

export async function setBiometricUnlockEnabled(
  enabled: boolean,
): Promise<void> {
  await Preferences.set({
    key: ENABLED_KEY,
    value: enabled ? "1" : "0",
  });
}

/** Prompt Face ID / Touch ID. Throws if the user cancels or auth fails. */
export async function verifyBiometricUnlock(reason: string): Promise<void> {
  const { NativeBiometric } = await import(
    "@capgo/capacitor-native-biometric"
  );
  await NativeBiometric.verifyIdentity({
    reason,
    title: "Unlock REGI",
    subtitle: reason,
    description: "Confirm it’s you to open REGI.",
    negativeButtonText: "Cancel",
    maxAttempts: 3,
  });
}
