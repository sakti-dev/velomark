export function detectTextDirection(text: string): "ltr" | "rtl" {
  const rtlChars =
    /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
  return rtlChars.test(text) ? "rtl" : "ltr";
}
