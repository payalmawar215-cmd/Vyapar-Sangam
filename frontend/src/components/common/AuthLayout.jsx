import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {Icon && (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-foreground text-background mb-4 shadow-sm">
              <Icon className="w-7 h-7" aria-hidden="true" />
            </div>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-light text-foreground">{title}</h1>
          {subtitle && <p className="font-body text-sm text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {children}
        </div>
        {footer && (
          <p className="text-center font-body text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
