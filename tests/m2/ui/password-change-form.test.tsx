import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const values: Record<string, string> = {
      currentPasswordLabel: "Kata sandi saat ini",
      newPasswordLabel: "Kata sandi baru",
      confirmPasswordLabel: "Konfirmasi kata sandi baru",
      showCurrentPassword: "Tampilkan kata sandi saat ini",
      hideCurrentPassword: "Sembunyikan kata sandi saat ini",
      showNewPassword: "Tampilkan kata sandi baru",
      hideNewPassword: "Sembunyikan kata sandi baru",
      showConfirmation: "Tampilkan konfirmasi kata sandi",
      hideConfirmation: "Sembunyikan konfirmasi kata sandi",
      submit: "Perbarui kata sandi",
      submitting: "Memperbarui",
      submittingStatus: "Sedang memperbarui kata sandi",
      success: "Kata sandi berhasil diperbarui.",
      successButton: "Berhasil diperbarui",
      "error.SESSION_INVALID": "Sesi Anda sudah tidak berlaku.",
      "error.INVALID_CREDENTIALS": "Kata sandi saat ini tidak sesuai.",
      "error.PASSWORD_POLICY": "Kata sandi baru belum dapat diterima.",
      "error.AUTH_UNAVAILABLE": "Layanan perubahan kata sandi sedang tidak tersedia.",
    };
    return values[key] ?? key;
  },
}));

const {PasswordChangeForm} = await import("@/components/auth/password-change-form");

describe("PasswordChangeForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("announces success and performs a full document navigation after the server issues a new session", async () => {
    const assign = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      redirectTo: "/id/portal-dosen",
    }), {status: 200, headers: {"content-type": "application/json"}})));
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {...window.location, assign},
    });

    render(<PasswordChangeForm locale="id" next="/id/portal-dosen" />);

    fireEvent.change(screen.getByLabelText("Kata sandi saat ini"), {
      target: {value: "OldDosenBrowser-123"},
    });
    fireEvent.change(screen.getByLabelText("Kata sandi baru"), {
      target: {value: "NewDosenBrowser-456"},
    });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi baru"), {
      target: {value: "NewDosenBrowser-456"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Perbarui kata sandi"}));

    expect((await screen.findByRole("status")).textContent).toContain("Kata sandi berhasil diperbarui.");
    expect(screen.getByRole("button", {name: "Berhasil diperbarui"}).getAttribute("aria-disabled")).toBe("true");
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/password?locale=id&redirectTo=%2Fid%2Fportal-dosen",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      }),
    );

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/id/portal-dosen"));
  });
});
