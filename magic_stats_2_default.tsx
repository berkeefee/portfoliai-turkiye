// demo.tsx

import { StatsCard } from '@/components/ui/stats-card-1'; // Adjust the import path as needed
import { Users, CreditCard, IndianRupee, Activity } from 'lucide-react'; // Using lucide-react for icons

const StatsCardDemo = () => {
  return (
    <div className="bg-background min-h-screen w-full p-4 sm:p-8">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value="₹4,52,318"
          icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />}
          change="+20.1%"
          changeType="positive"
        />
        <StatsCard
          title="Subscriptions"
          value="+2350"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          change="+180.1%"
          changeType="positive"
        />
        <StatsCard
          title="Sales"
          value="+12,234"
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          change="+19%"
          changeType="positive"
        />
        <StatsCard
          title="Active Now"
          value="+573"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          change="-2.1%"
          changeType="negative"
        />
        <StatsCard
          title="Total Revenue"
          value="₹4,52,318"
          icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />}
          change="+20.1%"
          changeType="positive"
        />
        <StatsCard
          title="Subscriptions"
          value="+2350"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          change="+180.1%"
          changeType="positive"
        />
      </div>
    </div>
  );
};

export default StatsCardDemo;