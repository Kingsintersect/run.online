import { permanentRedirect } from "next/navigation";

export default function StudentPage() {
    permanentRedirect("/director/dashboard");
}
