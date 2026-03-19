import React from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES, LOCALE_FLAGS, type SupportedLocale } from "../../i18n/index.js";

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "en") as SupportedLocale;

  return (
    <div className="px-3 pb-2">
      <p className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
        {t("languages.switchLanguage")}
      </p>
      <div className="flex gap-1.5">
        {SUPPORTED_LOCALES.map((locale) => {
          const isActive = current === locale;
          return (
            <button
              key={locale}
              onClick={() => void i18n.changeLanguage(locale)}
              title={t(`languages.${locale}`)}
              className={[
                // Base pill
                "flex items-center gap-1 rounded-md border px-2 py-1",
                "font-mono text-[11px] font-bold tracking-wider transition-all duration-200",
                isActive
                  ? // Active: synthwave neon glow
                    [
                      "border-brand-500 bg-brand-900/40 text-brand-300",
                      "shadow-[0_0_8px_var(--color-primary),inset_0_0_4px_var(--color-primary)_/_0.15]",
                    ].join(" ")
                  : // Inactive: dim
                    "border-slate-700 bg-transparent text-slate-500 hover:border-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              <span className="text-[13px] leading-none">{LOCALE_FLAGS[locale]}</span>
              <span>{locale.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
