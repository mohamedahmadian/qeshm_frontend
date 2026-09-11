import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthProvider'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { useSelectNumberOnFocus } from './hooks/useSelectNumberOnFocus'
import { languages, type AppLanguage } from './i18n'
import { NavigationHistoryProvider } from './lib/navigation-history'
import { AccountPage } from './pages/AccountPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ImpersonateEndedPage } from './pages/ImpersonateEndedPage'
import { ImpersonateEntryPage } from './pages/ImpersonateEntryPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { CitiesListPage } from './pages/geo/CitiesListPage'
import { CityCreatePage } from './pages/geo/CityCreatePage'
import { CityDetailPage } from './pages/geo/CityDetailPage'
import { CityEditPage } from './pages/geo/CityEditPage'
import { CountriesListPage } from './pages/geo/CountriesListPage'
import { CountryCreatePage } from './pages/geo/CountryCreatePage'
import { CountryDetailPage } from './pages/geo/CountryDetailPage'
import { CountryEditPage } from './pages/geo/CountryEditPage'
import { ProvinceCreatePage } from './pages/geo/ProvinceCreatePage'
import { ProvinceDetailPage } from './pages/geo/ProvinceDetailPage'
import { ProvinceEditPage } from './pages/geo/ProvinceEditPage'
import { ProvincesListPage } from './pages/geo/ProvincesListPage'
import { RoleCreatePage } from './pages/roles/RoleCreatePage'
import { RoleDetailPage } from './pages/roles/RoleDetailPage'
import { RoleEditPage } from './pages/roles/RoleEditPage'
import { RolesListPage } from './pages/roles/RolesListPage'
import { ProjectCreatePage } from './pages/projects/ProjectCreatePage'
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage'
import { ProjectEditPage } from './pages/projects/ProjectEditPage'
import { ProjectLiveBoardPage } from './pages/projects/ProjectLiveBoardPage'
import { ProjectReportsPage } from './pages/projects/ProjectReportsPage'
import { ProjectsListPage } from './pages/projects/ProjectsListPage'
import { ContractorCreatePage } from './pages/projects/contractors/ContractorCreatePage'
import { ContractorDetailPage } from './pages/projects/contractors/ContractorDetailPage'
import { ContractorEditPage } from './pages/projects/contractors/ContractorEditPage'
import { ContractorsListPage } from './pages/projects/contractors/ContractorsListPage'
import {
  GlobalContractorCreatePage,
  GlobalContractorDetailPage,
  GlobalContractorEditPage,
  GlobalContractorsListPage,
} from './pages/projects/contractors/GlobalContractorPages'
import {
  ContractorProjectCreatePage,
  ContractorProjectListPage,
} from './pages/projects/contractors/ContractorProjectPages'
import {
  ContractorPaymentCreatePage,
  ContractorPaymentDetailPage,
  ContractorPaymentEditPage,
  ContractorPaymentListPage,
} from './pages/projects/contractors/ContractorPaymentPages'
import {
  ContractorPhaseCreatePage,
  ContractorPhaseDetailPage,
  ContractorPhaseEditPage,
  ContractorPhaseListPage,
} from './pages/projects/contractors/ContractorPhasePages'
import {
  ContractorTeamCreatePage,
  ContractorTeamDetailPage,
  ContractorTeamEditPage,
  ContractorTeamListPage,
} from './pages/projects/contractors/ContractorTeamPages'
import {
  ProjectPhaseCreatePage,
  ProjectPhaseDetailPage,
  ProjectPhaseEditPage,
  ProjectPhaseListPage,
} from './pages/projects/phases/ProjectPhasePages'
import {
  ProjectProgressCreatePage,
  ProjectProgressDetailPage,
  ProjectProgressEditPage,
  ProjectProgressListPage,
} from './pages/projects/progress/ProjectProgressPages'
import {
  FoodReservationHistoryDetailPage,
  FoodReservationHistoryListPage,
} from './pages/food-reservation/history/FoodReservationHistoryPages'
import { FoodCostEstimateReportPage } from './pages/food-reservation/report/FoodCostEstimateReportPage'
import { FoodReservationReportPage } from './pages/food-reservation/report/FoodReservationReportPage'
import {
  FoodReserveCreatePage,
  FoodReserveDetailPage,
  FoodReserveListPage,
} from './pages/food-reservation/reserve/FoodReservePages'
import { FoodCreatePage } from './pages/food-reservation/foods/FoodCreatePage'
import { FoodDetailPage } from './pages/food-reservation/foods/FoodDetailPage'
import { FoodEditPage } from './pages/food-reservation/foods/FoodEditPage'
import { FoodsListPage } from './pages/food-reservation/foods/FoodsListPage'
import { RestaurantCreatePage } from './pages/food-reservation/restaurants/RestaurantCreatePage'
import { RestaurantDetailPage } from './pages/food-reservation/restaurants/RestaurantDetailPage'
import { RestaurantEditPage } from './pages/food-reservation/restaurants/RestaurantEditPage'
import { RestaurantsListPage } from './pages/food-reservation/restaurants/RestaurantsListPage'
import {
  RestaurantMenuCreatePage,
  RestaurantMenuDetailPage,
  RestaurantMenuEditPage,
  RestaurantMenuListPage,
} from './pages/food-reservation/restaurants/menu/RestaurantMenuPages'
import { EmployeeCreatePage, EmployeeListPage } from './pages/organization/employees/EmployeePages'
import { OrganizationCreatePage } from './pages/organization/OrganizationCreatePage'
import { OrganizationDetailPage } from './pages/organization/OrganizationDetailPage'
import { OrganizationEditPage } from './pages/organization/OrganizationEditPage'
import {
  OrganizationPhoneCreatePage,
  OrganizationPhoneDetailPage,
  OrganizationPhoneEditPage,
  OrganizationPhoneListPage,
} from './pages/organization/phones/OrganizationPhonePages'
import {
  OrganizationPositionCreatePage,
  OrganizationPositionDetailPage,
  OrganizationPositionEditPage,
  OrganizationPositionListPage,
} from './pages/organization/positions/OrganizationPositionPages'
import {
  OrganizationUnitKindCreatePage,
  OrganizationUnitKindDetailPage,
  OrganizationUnitKindEditPage,
  OrganizationUnitKindListPage,
} from './pages/organization/unit-kinds/OrganizationUnitKindPages'
import {
  OrganizationUnitCreatePage,
  OrganizationUnitDetailPage,
  OrganizationUnitEditPage,
  OrganizationUnitListPage,
} from './pages/organization/units/OrganizationUnitPages'
import {
  OrganizationUnitRestaurantCreatePage,
  OrganizationUnitRestaurantDetailPage,
  OrganizationUnitRestaurantEditPage,
  OrganizationUnitRestaurantListPage,
} from './pages/organization/units/restaurants/OrganizationUnitRestaurantPages'
import { PublicProfilePage } from './pages/public-profile/PublicProfilePage'
import { UserCreatePage } from './pages/users/UserCreatePage'
import { UserDetailPage } from './pages/users/UserDetailPage'
import { UserEditPage } from './pages/users/UserEditPage'
import { UserLocationHistoryPage } from './pages/users/UserLocationHistoryPage'
import { UserLocationPage } from './pages/users/UserLocationPage'
import { UsersListPage } from './pages/users/UsersListPage'
import {
  VehicleAssignmentCreatePage,
  VehicleAssignmentDetailPage,
  VehicleAssignmentEditPage,
  VehicleAssignmentListPage,
  VehicleAssignmentReturnPage,
} from './pages/vehicles/assignments/VehicleAssignmentPages'
import {
  VehicleCreatePage,
  VehicleDetailPage,
  VehicleEditPage,
  VehicleListPage,
} from './pages/vehicles/VehiclePages'
import {
  VehicleBrandCreatePage,
  VehicleBrandDetailPage,
  VehicleBrandEditPage,
  VehicleBrandListPage,
} from './pages/vehicles/brands/VehicleBrandPages'
import { VehicleReportsPage } from './pages/vehicles/VehicleReportsPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

const queryClient = new QueryClient()

function AppToaster() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.split('-')[0] as AppLanguage) || 'fa'
  return (
    <Toaster
      richColors
      position="bottom-center"
      className="app-toaster"
      swipeDirections={['bottom', 'left', 'right']}
      dir={languages[lang]?.dir ?? 'rtl'}
    />
  )
}

export default function App() {
  useSelectNumberOnFocus()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <NavigationHistoryProvider>
            <AppToaster />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/impersonate" element={<ImpersonateEntryPage />} />
              <Route path="/impersonate-ended" element={<ImpersonateEndedPage />} />
              <Route path="/p/:id" element={<PublicProfilePage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/password" element={<ChangePasswordPage />} />
                  <Route path="/users" element={<UsersListPage />} />
                  <Route path="/users/new" element={<UserCreatePage />} />
                  <Route path="/users/:id" element={<UserDetailPage />} />
                  <Route path="/users/:id/edit" element={<UserEditPage />} />
                  <Route path="/users/:id/location" element={<UserLocationPage />} />
                  <Route path="/users/:id/location/history" element={<UserLocationHistoryPage />} />
                  <Route path="/base-info/countries" element={<CountriesListPage />} />
                  <Route path="/base-info/countries/new" element={<CountryCreatePage />} />
                  <Route path="/base-info/countries/:id" element={<CountryDetailPage />} />
                  <Route path="/base-info/countries/:id/edit" element={<CountryEditPage />} />
                  <Route path="/base-info/provinces" element={<ProvincesListPage />} />
                  <Route path="/base-info/provinces/new" element={<ProvinceCreatePage />} />
                  <Route path="/base-info/provinces/:id" element={<ProvinceDetailPage />} />
                  <Route path="/base-info/provinces/:id/edit" element={<ProvinceEditPage />} />
                  <Route path="/base-info/cities" element={<CitiesListPage />} />
                  <Route path="/base-info/cities/new" element={<CityCreatePage />} />
                  <Route path="/base-info/cities/:id" element={<CityDetailPage />} />
                  <Route path="/base-info/cities/:id/edit" element={<CityEditPage />} />
                  <Route path="/base-info/roles" element={<RolesListPage />} />
                  <Route path="/base-info/roles/new" element={<RoleCreatePage />} />
                  <Route path="/base-info/roles/:id" element={<RoleDetailPage />} />
                  <Route path="/base-info/roles/:id/edit" element={<RoleEditPage />} />
                  <Route path="/projects" element={<ProjectsListPage />} />
                  <Route path="/projects/reports" element={<ProjectReportsPage />} />
                  <Route path="/projects/live-board" element={<ProjectLiveBoardPage />} />
                  <Route path="/projects/contractors" element={<GlobalContractorsListPage />} />
                  <Route path="/projects/contractors/new" element={<GlobalContractorCreatePage />} />
                  <Route path="/projects/contractors/:contractorId/projects" element={<ContractorProjectListPage />} />
                  <Route path="/projects/contractors/:contractorId/projects/new" element={<ContractorProjectCreatePage />} />
                  <Route path="/projects/contractors/:contractorId/edit" element={<GlobalContractorEditPage />} />
                  <Route path="/projects/contractors/:contractorId" element={<GlobalContractorDetailPage />} />
                  <Route path="/projects/new" element={<ProjectCreatePage />} />
                  <Route path="/projects/:id/progress" element={<ProjectProgressListPage />} />
                  <Route path="/projects/:id/progress/new" element={<ProjectProgressCreatePage />} />
                  <Route path="/projects/:id/progress/:entryId" element={<ProjectProgressDetailPage />} />
                  <Route path="/projects/:id/progress/:entryId/edit" element={<ProjectProgressEditPage />} />
                  <Route path="/projects/:id/phases" element={<ProjectPhaseListPage />} />
                  <Route path="/projects/:id/phases/new" element={<ProjectPhaseCreatePage />} />
                  <Route path="/projects/:id/phases/:phaseId" element={<ProjectPhaseDetailPage />} />
                  <Route path="/projects/:id/phases/:phaseId/edit" element={<ProjectPhaseEditPage />} />
                  <Route path="/projects/:id/contractors" element={<ContractorsListPage />} />
                  <Route path="/projects/:id/contractors/new" element={<ContractorCreatePage />} />
                  <Route path="/projects/:id/contractors/:contractorId/team" element={<ContractorTeamListPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/team/new" element={<ContractorTeamCreatePage />} />
                  <Route path="/projects/:id/contractors/:contractorId/team/:memberId" element={<ContractorTeamDetailPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/team/:memberId/edit" element={<ContractorTeamEditPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/phases" element={<ContractorPhaseListPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/phases/new" element={<ContractorPhaseCreatePage />} />
                  <Route path="/projects/:id/contractors/:contractorId/phases/:phaseId" element={<ContractorPhaseDetailPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/phases/:phaseId/edit" element={<ContractorPhaseEditPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/payments" element={<ContractorPaymentListPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/payments/new" element={<ContractorPaymentCreatePage />} />
                  <Route path="/projects/:id/contractors/:contractorId/payments/:paymentId" element={<ContractorPaymentDetailPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/payments/:paymentId/edit" element={<ContractorPaymentEditPage />} />
                  <Route path="/projects/:id/contractors/:contractorId" element={<ContractorDetailPage />} />
                  <Route path="/projects/:id/contractors/:contractorId/edit" element={<ContractorEditPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="/projects/:id/edit" element={<ProjectEditPage />} />
                  <Route path="/food-reservation/foods" element={<FoodsListPage />} />
                  <Route path="/food-reservation/foods/new" element={<FoodCreatePage />} />
                  <Route path="/food-reservation/foods/:id" element={<FoodDetailPage />} />
                  <Route path="/food-reservation/foods/:id/edit" element={<FoodEditPage />} />
                  <Route path="/food-reservation/restaurants" element={<RestaurantsListPage />} />
                  <Route path="/food-reservation/restaurants/new" element={<RestaurantCreatePage />} />
                  <Route path="/food-reservation/restaurants/:id/menu" element={<RestaurantMenuListPage />} />
                  <Route path="/food-reservation/restaurants/:id/menu/new" element={<RestaurantMenuCreatePage />} />
                  <Route path="/food-reservation/restaurants/:id/menu/:itemId" element={<RestaurantMenuDetailPage />} />
                  <Route path="/food-reservation/restaurants/:id/menu/:itemId/edit" element={<RestaurantMenuEditPage />} />
                  <Route path="/food-reservation/restaurants/:id" element={<RestaurantDetailPage />} />
                  <Route path="/food-reservation/restaurants/:id/edit" element={<RestaurantEditPage />} />
                  <Route path="/food-reservation/reserve" element={<FoodReserveListPage />} />
                  <Route path="/food-reservation/reserve/new" element={<FoodReserveCreatePage />} />
                  <Route path="/food-reservation/reserve/:id" element={<FoodReserveDetailPage />} />
                  <Route path="/food-reservation/history" element={<FoodReservationHistoryListPage />} />
                  <Route path="/food-reservation/history/:id" element={<FoodReservationHistoryDetailPage />} />
                  <Route path="/food-reservation/report" element={<FoodReservationReportPage />} />
                  <Route path="/food-reservation/cost-estimate" element={<FoodCostEstimateReportPage />} />
                  <Route path="/organization" element={<OrganizationDetailPage />} />
                  <Route path="/organization/new" element={<OrganizationCreatePage />} />
                  <Route path="/organization/edit" element={<OrganizationEditPage />} />
                  <Route path="/organization/phones" element={<OrganizationPhoneListPage />} />
                  <Route path="/organization/phones/new" element={<OrganizationPhoneCreatePage />} />
                  <Route path="/organization/phones/:phoneId" element={<OrganizationPhoneDetailPage />} />
                  <Route path="/organization/phones/:phoneId/edit" element={<OrganizationPhoneEditPage />} />
                  <Route path="/organization/positions" element={<OrganizationPositionListPage />} />
                  <Route path="/organization/positions/new" element={<OrganizationPositionCreatePage />} />
                  <Route path="/organization/positions/:id" element={<OrganizationPositionDetailPage />} />
                  <Route path="/organization/positions/:id/edit" element={<OrganizationPositionEditPage />} />
                  <Route path="/organization/unit-kinds" element={<OrganizationUnitKindListPage />} />
                  <Route path="/organization/unit-kinds/new" element={<OrganizationUnitKindCreatePage />} />
                  <Route path="/organization/unit-kinds/:id" element={<OrganizationUnitKindDetailPage />} />
                  <Route path="/organization/unit-kinds/:id/edit" element={<OrganizationUnitKindEditPage />} />
                  <Route path="/organization/units" element={<OrganizationUnitListPage />} />
                  <Route path="/organization/units/new" element={<OrganizationUnitCreatePage />} />
                  <Route path="/organization/units/:id/restaurants" element={<OrganizationUnitRestaurantListPage />} />
                  <Route path="/organization/units/:id/restaurants/new" element={<OrganizationUnitRestaurantCreatePage />} />
                  <Route path="/organization/units/:id/restaurants/:linkId" element={<OrganizationUnitRestaurantDetailPage />} />
                  <Route path="/organization/units/:id/restaurants/:linkId/edit" element={<OrganizationUnitRestaurantEditPage />} />
                  <Route path="/organization/units/:id" element={<OrganizationUnitDetailPage />} />
                  <Route path="/organization/units/:id/edit" element={<OrganizationUnitEditPage />} />
                  <Route path="/organization/employees" element={<EmployeeListPage />} />
                  <Route path="/organization/employees/new" element={<EmployeeCreatePage />} />
                  <Route path="/organization/employees/:id" element={<UserDetailPage />} />
                  <Route path="/organization/employees/:id/edit" element={<UserEditPage />} />
                  <Route path="/vehicles" element={<VehicleListPage />} />
                  <Route path="/vehicles/reports" element={<VehicleReportsPage />} />
                  <Route path="/vehicles/brands" element={<VehicleBrandListPage />} />
                  <Route path="/vehicles/brands/new" element={<VehicleBrandCreatePage />} />
                  <Route path="/vehicles/brands/:id" element={<VehicleBrandDetailPage />} />
                  <Route path="/vehicles/brands/:id/edit" element={<VehicleBrandEditPage />} />
                  <Route path="/vehicles/new" element={<VehicleCreatePage />} />
                  <Route path="/vehicles/:id/assignments" element={<VehicleAssignmentListPage />} />
                  <Route path="/vehicles/:id/assignments/new" element={<VehicleAssignmentCreatePage />} />
                  <Route path="/vehicles/:id/assignments/:assignmentId/return" element={<VehicleAssignmentReturnPage />} />
                  <Route path="/vehicles/:id/assignments/:assignmentId" element={<VehicleAssignmentDetailPage />} />
                  <Route path="/vehicles/:id/assignments/:assignmentId/edit" element={<VehicleAssignmentEditPage />} />
                  <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
                  <Route path="/vehicles/:id/edit" element={<VehicleEditPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NavigationHistoryProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
