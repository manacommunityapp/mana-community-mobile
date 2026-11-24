export interface ModuleConfig {
  value: string;
  label: string;
  icon: string;
  group: string;
}

export const MODULE_CONFIGS: ModuleConfig[] = [
  { value: 'PERSON',                label: 'People & Skills',   icon: '👤', group: 'People'      },
  { value: 'EVENT',                 label: 'Events',            icon: '🎉', group: 'Events'      },
  { value: 'POOJA',                 label: 'Pooja & Religious', icon: '🪔', group: 'Events'      },
  { value: 'SPORTS_EVENT',          label: 'Sports',            icon: '⚽', group: 'Sports'      },
  { value: 'COACHING',              label: 'Coaching',          icon: '🏋️', group: 'Sports'      },
  { value: 'FOOD_RESTAURANT',       label: 'Restaurants',       icon: '🍽️', group: 'Food'        },
  { value: 'FOOD_MENU_ITEM',        label: 'Menu Items',        icon: '🍛', group: 'Food'        },
  { value: 'GROCERY_PRODUCT',       label: 'Grocery',           icon: '🛒', group: 'Food'        },
  { value: 'HOME_CHEF',             label: 'Home Chefs',        icon: '👨‍🍳', group: 'Food'        },
  { value: 'HOME_SERVICE',          label: 'Home Services',     icon: '🔧', group: 'Services'    },
  { value: 'VENDOR',                label: 'Vendors',           icon: '🏪', group: 'Services'    },
  { value: 'MARKETPLACE_LISTING',   label: 'Marketplace',       icon: '🏷️', group: 'Marketplace' },
  { value: 'HEALTH_DOCTOR',         label: 'Doctors',           icon: '🩺', group: 'Health'      },
  { value: 'HEALTH_CLINIC',         label: 'Clinics',           icon: '🏥', group: 'Health'      },
  { value: 'COURSE',                label: 'Courses',           icon: '📚', group: 'Education'   },
  { value: 'WORKSHOP',              label: 'Workshops',         icon: '🎨', group: 'Education'   },
  { value: 'TRIP',                  label: 'Trips',             icon: '✈️', group: 'Travel'      },
  { value: 'RIDE',                  label: 'Rides',             icon: '🚗', group: 'Travel'      },
  { value: 'JOB',                   label: 'Jobs',              icon: '💼', group: 'Work'        },
  { value: 'PROFESSIONAL_SERVICE',  label: 'Pro Services',      icon: '👔', group: 'Work'        },
];

export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  MODULE_CONFIGS.map((m) => [m.value, m.label]),
);
export const MODULE_ICON: Record<string, string> = Object.fromEntries(
  MODULE_CONFIGS.map((m) => [m.value, m.icon]),
);

// Background tints for result card icon placeholder
export const MODULE_BG: Record<string, string> = {
  PERSON:               '#EDE9FE',
  EVENT:                '#FEF3C7',
  POOJA:                '#FFF7ED',
  SPORTS_EVENT:         '#DBEAFE',
  COACHING:             '#D1FAE5',
  FOOD_RESTAURANT:      '#FEE2E2',
  FOOD_MENU_ITEM:       '#FEF9C3',
  GROCERY_PRODUCT:      '#DCFCE7',
  HOME_CHEF:            '#FDE8D8',
  HOME_SERVICE:         '#E0F2FE',
  VENDOR:               '#F3E8FF',
  MARKETPLACE_LISTING:  '#FDF2F8',
  HEALTH_DOCTOR:        '#D1FAE5',
  HEALTH_CLINIC:        '#ECFDF5',
  COURSE:               '#EFF6FF',
  WORKSHOP:             '#FFF1F2',
  TRIP:                 '#E0F2FE',
  RIDE:                 '#F0FDF4',
  JOB:                  '#FEF9C3',
  PROFESSIONAL_SERVICE: '#EDE9FE',
};
