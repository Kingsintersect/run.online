import { HomepageSlider } from "@/components/slider/HomepageSlider"
import Footer from "@/components/navigation/Footer"
import QhubBanner from "./components/QhubBanner"
import LegacySections from "./components/LegacySections"


export default function Page() {
	return (
		<div>
			<HomepageSlider />
			<QhubBanner />
			<div className=" mx-auto px-4 sm:px-6 lg:px-4">
				<LegacySections />
			</div>
			<Footer />
		</div>
	)
}
