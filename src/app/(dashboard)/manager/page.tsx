import { permanentRedirect } from "next/navigation";

export default function ManagerPage() {
    permanentRedirect("/manager/dashboard");
}