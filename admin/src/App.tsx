import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Deposits from "./pages/Deposits";
import Payouts from "./pages/Payouts";
import Plans from "./pages/Plans";
import PaymentDetailsPage from "./pages/PaymentDetails";
import Users from "./pages/Users";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("adminToken")) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="deposits" element={<Deposits />} />
        <Route path="purchases" element={<Navigate to="/deposits" replace />} />
        <Route path="payouts" element={<Payouts />} />
        <Route path="plans" element={<Plans />} />
        <Route path="payment-details" element={<PaymentDetailsPage />} />
        <Route path="users" element={<Users />} />
        <Route path="support" element={<Support />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
