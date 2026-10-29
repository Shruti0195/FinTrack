import React from 'react';
import {
  Target,
  Smartphone,
  Plane,
  ShieldCheck,
  Home,
  Car,
  Laptop,
  Gift,
  Sparkles,
  Heart,
  Zap,
  Award,
  TrendingUp,
  GraduationCap,
  Briefcase,
  Camera,
  Coffee,
  ShoppingBag,
  BookOpen,
  Dumbbell,
  Music,
  Smile,
  Star,
  PiggyBank,
  Compass,
  Trophy,
  Watch,
  Tv,
  Headphones,
  Key,
  Wallet,
  Gem,
  Sun,
  Umbrella,
  Anchor,
  Bike,
  Flag
} from 'lucide-react';

export interface IconDefinition {
  key: string;
  label: string;
  IconComp: React.ComponentType<{ size?: number | string; color?: string; className?: string; style?: React.CSSProperties }>;
}

export const AVAILABLE_GOAL_ICONS: IconDefinition[] = [
  { key: 'target', label: 'Target', IconComp: Target },
  { key: 'phone', label: 'Phone', IconComp: Smartphone },
  { key: 'plane', label: 'Travel', IconComp: Plane },
  { key: 'shield', label: 'Emergency', IconComp: ShieldCheck },
  { key: 'home', label: 'Home', IconComp: Home },
  { key: 'car', label: 'Vehicle', IconComp: Car },
  { key: 'laptop', label: 'Gadget', IconComp: Laptop },
  { key: 'gift', label: 'Gift', IconComp: Gift },
  { key: 'sparkles', label: 'Dream', IconComp: Sparkles },
  { key: 'heart', label: 'Personal', IconComp: Heart },
  { key: 'piggy-bank', label: 'Savings', IconComp: PiggyBank },
  { key: 'wallet', label: 'Wallet', IconComp: Wallet },
  { key: 'graduation-cap', label: 'Education', IconComp: GraduationCap },
  { key: 'briefcase', label: 'Career', IconComp: Briefcase },
  { key: 'trending-up', label: 'Investment', IconComp: TrendingUp },
  { key: 'trophy', label: 'Achievement', IconComp: Trophy },
  { key: 'award', label: 'Award', IconComp: Award },
  { key: 'star', label: 'Milestone', IconComp: Star },
  { key: 'gem', label: 'Luxury', IconComp: Gem },
  { key: 'camera', label: 'Creative', IconComp: Camera },
  { key: 'coffee', label: 'Lifestyle', IconComp: Coffee },
  { key: 'shopping-bag', label: 'Shopping', IconComp: ShoppingBag },
  { key: 'book-open', label: 'Learning', IconComp: BookOpen },
  { key: 'dumbbell', label: 'Fitness', IconComp: Dumbbell },
  { key: 'bike', label: 'Cycling', IconComp: Bike },
  { key: 'music', label: 'Music', IconComp: Music },
  { key: 'smile', label: 'Happiness', IconComp: Smile },
  { key: 'zap', label: 'Power', IconComp: Zap },
  { key: 'compass', label: 'Adventure', IconComp: Compass },
  { key: 'watch', label: 'Time', IconComp: Watch },
  { key: 'tv', label: 'Entertainment', IconComp: Tv },
  { key: 'headphones', label: 'Audio', IconComp: Headphones },
  { key: 'key', label: 'Property', IconComp: Key },
  { key: 'sun', label: 'Vacation', IconComp: Sun },
  { key: 'umbrella', label: 'Protection', IconComp: Umbrella },
  { key: 'anchor', label: 'Stability', IconComp: Anchor },
  { key: 'flag', label: 'Goal Post', IconComp: Flag }
];

export const renderGoalIcon = (iconKey?: string, size = 20, color = 'currentColor'): React.ReactElement => {
  if (!iconKey) {
    return <Target size={size} color={color} />;
  }
  const cleanKey = iconKey.trim().toLowerCase();
  const matched = AVAILABLE_GOAL_ICONS.find(i => i.key.toLowerCase() === cleanKey);
  if (matched) {
    const Component = matched.IconComp;
    return <Component size={size} color={color} />;
  }
  return <Target size={size} color={color} />;
};
