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




const todayActivitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activities/today',
  component: TodayActivitiesPage,
})
// ---------- Root ----------
const rootRoute = createRootRoute({
  component: RootLayout,
})

// ---------- صفحات ----------
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const dbTestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/db-test',
  component: DbTestPage,
})

const customersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customers',
  component: CustomersPage,
})

const customersNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customers/new',
  component: CustomerFormPage,
})

const customerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customers/$customerId',
  component: CustomerDetailPage,
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsPage,
})

const projectsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/new',
  component: ProjectFormPage,
})

const projectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: ProjectDetailPage,
})

// ---------- درخت مسیرها ----------
const routeTree = rootRoute.addChildren([
  indexRoute,
  dbTestRoute,
  customersRoute,
  customersNewRoute,
  customerDetailRoute,
  projectsRoute,
  projectsNewRoute,
  projectDetailRoute,
  todayActivitiesRoute,
])

// ---------- ساخت Router ----------
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

// برای TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}