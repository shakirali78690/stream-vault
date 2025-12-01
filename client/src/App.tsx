import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Chatbot } from "@/components/chatbot";
import Home from "@/pages/home";
import ShowDetail from "@/pages/show-detail";
import Watch from "@/pages/watch";
import MovieDetail from "@/pages/movie-detail";
import WatchMovie from "@/pages/watch-movie";
import Search from "@/pages/search";
import Category from "@/pages/category";
import Watchlist from "@/pages/watchlist";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";
import Privacy from "@/pages/privacy";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Terms from "@/pages/terms";
import DMCA from "@/pages/dmca";
import Help from "@/pages/help";
import FAQ from "@/pages/faq";
import Report from "@/pages/report";
import Request from "@/pages/request";
import Movies from "@/pages/movies";
import BrowseShows from "@/pages/browse-shows";
import BrowseMovies from "@/pages/browse-movies";
import Trending from "@/pages/trending";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <Header />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/show/:slug" component={ShowDetail} />
          <Route path="/watch/:slug" component={Watch} />
          <Route path="/movie/:slug" component={MovieDetail} />
          <Route path="/watch-movie/:slug" component={WatchMovie} />
          <Route path="/search" component={Search} />
          <Route path="/category/:slug" component={Category} />
          <Route path="/watchlist" component={Watchlist} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin" component={Admin} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/terms" component={Terms} />
          <Route path="/dmca" component={DMCA} />
          <Route path="/help" component={Help} />
          <Route path="/faq" component={FAQ} />
          <Route path="/report" component={Report} />
          <Route path="/request" component={Request} />
          <Route path="/series" component={Home} />
          <Route path="/movies" component={Movies} />
          <Route path="/browse/shows" component={BrowseShows} />
          <Route path="/browse/movies" component={BrowseMovies} />
          <Route path="/trending" component={Trending} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <Chatbot />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
