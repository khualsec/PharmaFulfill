import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  // Get theme from document attribute instead of next-themes
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  
  return (
    <Sonner
      theme={theme === 'dark' ? 'dark' : 'light'}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
