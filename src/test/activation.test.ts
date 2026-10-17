import { test, expect } from "vitest";
import { xor, isSafeUrl } from "@/lib/activation";
test("xor roundtrip", () => { expect(xor(xor('{"status":101}', "KEY"), "KEY")).toBe('{"status":101}'); });
test("blocks private", () => { for (const u of ["http://127.0.0.1/x","http://10.1.1.1","http://169.254.169.254","http://192.168.1.1","http://[::1]/","http://a:b@x.com"]) expect(isSafeUrl(u)).toBe(false); expect(isSafeUrl("https://provider.com/api/config")).toBe(true); });
