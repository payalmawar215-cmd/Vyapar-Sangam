import { Link } from "react-router-dom";

export default function EmptyState({ title, subtitle, action, actionTo, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 md:py-36 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mb-8 text-muted-foreground">
          <Icon size={22} strokeWidth={1.25} />
        </div>
      )}
      <div className="hairline w-12 mb-8" />
      <h3 className="font-display text-display-md font-light text-foreground">{title}</h3>
      {subtitle && (
        <p className="font-body text-sm text-muted-foreground max-w-md mt-4 leading-relaxed">{subtitle}</p>
      )}
      {action && actionTo && (
        <Link to={actionTo} className="ghost-btn text-xs mt-10">
          {action}
        </Link>
      )}
    </div>
  );
}
