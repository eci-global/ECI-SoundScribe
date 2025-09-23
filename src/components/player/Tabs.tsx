import React from 'react';
import { Tab } from '@headlessui/react';
interface TabsProps {
  children: React.ReactNode;
  defaultIndex?: number;
}
interface TabListProps {
  children: React.ReactNode;
}
interface TabPanelsProps {
  children: React.ReactNode;
}
interface TabPanelProps {
  children: React.ReactNode;
}
function TabList({
  children
}: TabListProps) {
  return <Tab.List className="flex space-x-1 rounded-lg bg-gray-100 p-1 mb-4">
      {children}
    </Tab.List>;
}
function TabButton({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Tab className={({ selected }) =>
      `rounded-lg px-3 py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${
        selected
          ? 'bg-white text-blue-700 shadow-sm'
          : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
      }`
    }>
      {children}
    </Tab>
  );
}
function TabPanels({
  children
}: TabPanelsProps) {
  return <Tab.Panels>{children}</Tab.Panels>;
}
function TabPanel({
  children
}: TabPanelProps) {
  return <Tab.Panel className="focus:outline-none focus:ring-2 focus:ring-player-lavender focus:ring-offset-2">
      {children}
    </Tab.Panel>;
}
function Tabs({
  children,
  defaultIndex = 0
}: TabsProps) {
  return <Tab.Group defaultIndex={defaultIndex}>
      {children}
    </Tab.Group>;
}

// Export compound component
Tabs.List = TabList;
Tabs.Button = TabButton;
Tabs.Panels = TabPanels;
Tabs.Panel = TabPanel;
export default Tabs;