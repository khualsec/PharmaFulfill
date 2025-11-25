import { ReactNode, useState } from 'react';
import Navigation from './Navigation';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarTrigger,
  SidebarInset,
  SidebarHeader
} from './ui/sidebar';
import { 
  Home,
  User,
  FileText,
  Package,
  Users,
  BarChart3,
  Settings,
  MapPin,
  Bell,
  CreditCard,
  Clock,
  CheckCircle2,
  Shield
} from 'lucide-react';

interface MenuItem {
  title: string;
  icon: any;
  href?: string;
  onClick?: () => void;
}

interface MenuGroup {
  label?: string;
  items: MenuItem[];
}

interface DashboardLayoutProps {
  children: ReactNode;
  menuGroups: MenuGroup[];
  title: string;
  sidebarWidth?: string;
}

export default function DashboardLayout({ children, menuGroups, title, sidebarWidth = '16rem' }: DashboardLayoutProps) {
  const [activeItem, setActiveItem] = useState(menuGroups[0]?.items[0]?.title || '');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <SidebarProvider style={{ '--sidebar-width': sidebarWidth } as React.CSSProperties}>
        <Sidebar>
          <SidebarHeader className="border-b px-6 py-4">
            <h2 className="font-semibold">{title}</h2>
          </SidebarHeader>
          <SidebarContent>
            {menuGroups.map((group, groupIndex) => (
              <SidebarGroup key={groupIndex}>
                {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveItem(item.title);
                            item.onClick?.();
                          }}
                          isActive={activeItem === item.title}
                          className={activeItem === item.title ? 'bg-black text-white hover:bg-black hover:text-white dark:bg-white dark:text-black dark:hover:bg-white dark:hover:text-black' : ''}
                          size="lg"
                        >
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>
        
        <SidebarInset>
          <header className="flex h-16 items-center gap-4 border-b px-6">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export { 
  Home,
  User,
  FileText,
  Package,
  Users,
  BarChart3,
  Settings,
  MapPin,
  Bell,
  CreditCard,
  Clock,
  CheckCircle2,
  Shield
};