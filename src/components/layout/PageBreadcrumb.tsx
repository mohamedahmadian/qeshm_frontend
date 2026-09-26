import { ChevronLeft, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { currentPersianYear, formatNumber } from "../../lib/datetime";
import {
  getPageBreadcrumbs,
  type BreadcrumbNavModule,
} from "../../lib/page-breadcrumb";

export function PageBreadcrumb({
  pathname,
  modules,
}: {
  pathname: string;
  modules: BreadcrumbNavModule[];
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.split("-")[0] ?? "fa";
  const year = formatNumber(currentPersianYear(), locale);
  const crumbs = getPageBreadcrumbs(pathname, modules);

  return (
    <nav aria-label={t("nav.breadcrumb")} className="min-w-0 flex-1">
      <ol className="flex min-w-0 items-center gap-x-1 gap-y-1 text-sm lg:flex-wrap">
        {crumbs.map((crumb, index) => {
          const label = crumb.label ?? t(crumb.titleKey, { year });
          const isLast = index === crumbs.length - 1;
          return (
            <li
              key={`${crumb.titleKey}-${index}`}
              className={`min-w-0 items-center gap-1 ${
                isLast ? "flex max-w-full flex-1 lg:flex-none" : "hidden max-w-full lg:flex"
              }`}
            >
              {index > 0 ? (
                <ChevronLeft
                  className="hidden size-3.5 shrink-0 text-ink-300 lg:block ltr:rotate-180"
                  aria-hidden
                />
              ) : null}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="inline-flex min-w-0 max-w-full items-center gap-1 truncate rounded-lg px-1 py-0.5 text-ink-500 transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 lg:max-w-[14rem]"
                >
                  {index === 0 ? (
                    <Home className="size-3.5 shrink-0" aria-hidden />
                  ) : null}
                  <span className="min-w-0 truncate">{label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={`inline-flex min-w-0 max-w-full items-center gap-1 truncate px-1 py-0.5 lg:max-w-[16rem] ${
                    isLast ? "font-medium text-ink-900" : "text-ink-500"
                  }`}
                >
                  {index === 0 ? (
                    <Home
                      className={`size-3.5 shrink-0 ${isLast ? "text-teal-600" : ""}`}
                      aria-hidden
                    />
                  ) : null}
                  <span className="min-w-0 truncate">{label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
