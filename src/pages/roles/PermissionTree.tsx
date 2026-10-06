import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { fieldClassName } from "../../components/ui/Form";
import { FormEmptyHint } from "../../components/ui/FormLayout";
import { APP_NAV } from "../../lib/nav";
import type { NavModule } from "../../types/app";

function foldSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, "")
    .replace(/\s+/g, "");
}

function textMatches(value: string, needle: string) {
  return foldSearch(value).includes(needle);
}

function isSelected(code: string, selected: Set<string>, parentCode?: string) {
  return selected.has(code) || Boolean(parentCode && selected.has(parentCode));
}

export function compactPermissionCodes(
  selected: Iterable<string>,
  nav: NavModule[] = APP_NAV,
) {
  const set = new Set(selected);
  const result: string[] = [];
  for (const mod of nav) {
    const childCodes = mod.menus.map((menu) => menu.code);
    const allChildren =
      childCodes.length > 0 &&
      childCodes.every((code) => set.has(code) || set.has(mod.code));
    if (set.has(mod.code) || allChildren) {
      result.push(mod.code);
    } else {
      for (const code of childCodes) {
        if (set.has(code)) result.push(code);
      }
    }
  }
  return result;
}

export function PermissionTree({
  selected,
  onChange,
  disabled,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);
  const needle = foldSearch(query.trim());
  const visibleModules = useMemo(() => {
    if (!needle) return APP_NAV;
    return APP_NAV.map((mod) => {
      const moduleHit =
        textMatches(t(mod.nameKey), needle) || textMatches(mod.code, needle);
      if (moduleHit) return mod;
      return {
        ...mod,
        menus: mod.menus.filter(
          (menu) =>
            textMatches(t(menu.nameKey), needle) ||
            textMatches(menu.code, needle),
        ),
      };
    }).filter((mod) => mod.menus.length > 0);
  }, [needle, t]);

  function commit(next: Set<string>) {
    onChange(compactPermissionCodes(next));
  }

  function toggleModule(mod: NavModule, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) {
      next.add(mod.code);
      for (const menu of mod.menus) next.add(menu.code);
    } else {
      next.delete(mod.code);
      for (const menu of mod.menus) next.delete(menu.code);
    }
    commit(next);
  }

  function toggleMenu(mod: NavModule, menuCode: string, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) {
      next.add(menuCode);
      const allChildren = mod.menus.every(
        (menu) =>
          menu.code === menuCode || next.has(menu.code) || next.has(mod.code),
      );
      if (allChildren) next.add(mod.code);
    } else {
      next.delete(menuCode);
      next.delete(mod.code);
    }
    commit(next);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-teal-600"
          aria-hidden
        />
        <input
          type="text"
          data-enter-ignore=""
          className={`${fieldClassName} ps-9 ${query ? "pe-10" : ""}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
          }}
          placeholder={t("accessRoles.permissionsSearchPlaceholder")}
          aria-label={t("accessRoles.permissionsSearch")}
        />
        {query ? (
          <button
            type="button"
            className="absolute end-2 top-1/2 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-ink-500 hover:bg-teal-50 hover:text-teal-700"
            aria-label={t("accessRoles.permissionsSearchClear")}
            onClick={() => setQuery("")}
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {visibleModules.length === 0 ? (
        <FormEmptyHint>{t("accessRoles.permissionsNoResults")}</FormEmptyHint>
      ) : null}
      {visibleModules.map((mod) => {
        const source = APP_NAV.find((item) => item.code === mod.code) ?? mod;
        const childCodes = source.menus.map((menu) => menu.code);
        const selectedChildren = childCodes.filter((code) =>
          isSelected(code, selectedSet, mod.code),
        );
        const parentChecked =
          isSelected(mod.code, selectedSet) ||
          (childCodes.length > 0 &&
            selectedChildren.length === childCodes.length);
        const parentIndeterminate =
          !parentChecked && selectedChildren.length > 0;

        return (
          <div
            key={mod.code}
            className="rounded-2xl border border-line bg-cream-50/70 p-3"
          >
            <CheckboxField
              id={`perm-${mod.code}`}
              checked={parentChecked}
              indeterminate={parentIndeterminate}
              disabled={disabled}
              label={t(source.nameKey)}
              onChange={(checked) => toggleModule(source, checked)}
            />
            <div className="ms-6 mt-2 grid gap-2">
              {mod.menus.map((menu) => (
                <CheckboxField
                  key={menu.code}
                  id={`perm-${menu.code}`}
                  checked={isSelected(menu.code, selectedSet, mod.code)}
                  disabled={disabled}
                  label={t(menu.nameKey)}
                  onChange={(checked) => toggleMenu(source, menu.code, checked)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
