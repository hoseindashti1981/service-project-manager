import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { RootLayout } from './root-layout'
import { HomePage } from '../../features/home/home-page'
import { DbTestPage } from '../../features/dev/db-test-page'
import { CustomersPage } from '../../features/customers/pages/customers-page'
import { CustomerFormPage } from '../../features/customers/pages/customer-form-page'
import { CustomerDetailPage } from '../../features/customers/pages/customer-detail-page'
import { ProjectsPage } from '../../features/projects/pages/projects-page'
import { ProjectFormPage } from '../../features/projects/pages/project-form-page'
import { ProjectDetailPage } from '../../features/projects/pages/project-detail-page'
import { TodayActivitiesPage } from '../../features/activities/pages/today-activities-page'
import { FinancePage } from '../../features/finance/pages/finance-page'
import { ReportsPage } from '../../features/reports/pages/reports-page'
import { CalendarPage } from '../../features/calendar/pages/calendar-page'
import { RemindersPage } from '../../features/reminders/pages/reminders-page'
import { ServicesPage } from '../../features/services/pages/services-page'

const rootRoute = createRootRoute({ component: RootLayout })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
const dbTestRoute = createRoute({ getParentRoute: () => rootRoute, path: '/db-test', component: DbTestPage })
const customersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/customers', component: CustomersPage })
const customersNewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/customers/new', component: CustomerFormPage })
const customerDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/customers/$customerId', component: CustomerDetailPage })
const projectsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/projects', component: ProjectsPage })
const projectsNewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/projects/new', component: ProjectFormPage })
const projectDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/projects/$projectId', component: ProjectDetailPage })
const todayActivitiesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/activities/today', component: TodayActivitiesPage })
const financeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/finance', component: FinancePage })
const reportsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reports', component: ReportsPage })
const calendarRoute = createRoute({ getParentRoute: () => rootRoute, path: '/calendar', component: CalendarPage })
const remindersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reminders', component: RemindersPage })
const servicesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/services', component: ServicesPage })

const routeTree = rootRoute.addChildren([
  indexRoute, dbTestRoute, customersRoute, customersNewRoute, customerDetailRoute,
  projectsRoute, projectsNewRoute, projectDetailRoute, todayActivitiesRoute, financeRoute, reportsRoute, calendarRoute, remindersRoute, servicesRoute,
])

const basepath = import.meta.env.BASE_URL === '/'
  ? undefined
  : import.meta.env.BASE_URL.slice(0, -1)

export const router = createRouter({
  routeTree,
  ...(basepath ? { basepath } : {}),
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
