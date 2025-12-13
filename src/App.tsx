import { useState } from "react";
import { AppLayout, type Page } from "@/components/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { ActivitiesPage } from "@/pages/ActivitiesPage";
import { MapPage } from "@/pages/MapPage";
import { UnitsProvider } from "@/lib/units";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  return (
    <UnitsProvider>
      <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {currentPage === "home" && <HomePage />}
        {currentPage === "activities" && <ActivitiesPage />}
        {currentPage === "map" && <MapPage />}
      </AppLayout>
    </UnitsProvider>
  );
}

export default App;
