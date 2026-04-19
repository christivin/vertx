import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export function TaskComposer({ onSubmit, onStop, busy = false }) {
    const [value, setValue] = useState("");
    return (_jsxs("div", { className: "rounded-[28px] border border-border-strong bg-surface-2 p-4 shadow-card backdrop-blur", children: [_jsx("textarea", { value: value, onChange: (event) => setValue(event.target.value), placeholder: "\u63CF\u8FF0\u4F60\u7684\u6D41\u7A0B\u76EE\u6807\uFF0C\u4F8B\u5982\uFF1A\u6574\u7406\u672C\u5468\u98DE\u4E66\u65E5\u62A5\u5E76\u751F\u6210\u590D\u76D8\u7ED3\u8BBA", className: "min-h-24 w-full resize-none bg-transparent text-base outline-none placeholder:text-text-muted" }), _jsxs("div", { className: "mt-4 flex items-center justify-between", children: [_jsx("button", { type: "button", className: "rounded-full border border-border-subtle px-3 py-2 text-sm text-text-secondary", children: "\u9644\u4EF6" }), _jsxs("div", { className: "flex gap-2", children: [busy ? (_jsx("button", { type: "button", onClick: onStop, className: "rounded-full border border-border-subtle px-4 py-2 text-sm text-text-primary", children: "\u505C\u6B62" })) : null, _jsx("button", { type: "button", onClick: () => {
                                    const next = value.trim();
                                    if (!next)
                                        return;
                                    onSubmit?.(next);
                                    setValue("");
                                }, className: "rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground", children: "\u53D1\u8D77\u4EFB\u52A1" })] })] })] }));
}
