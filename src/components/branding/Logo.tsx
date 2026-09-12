import Image from "next/image";
import Link from "next/link";
import { UNIVERSITY_LOGO_URL, UNIVERSITY_NAME } from "@/config/global.config";
import { cn } from "@/lib/utils";

type LogoProps = {
   href?: string;
   src?: string;
   alt?: string;
   title?: string;
   subtitle?: string;
   showText?: boolean;
   imageWidth?: number;
   imageHeight?: number;
   priority?: boolean;
   textPosition?: "right" | "left" | "bottom";
   align?: "start" | "center" | "end";
   className?: string;
   imageClassName?: string;
   textClassName?: string;
   titleClassName?: string;
   subtitleClassName?: string;
};

const alignClasses = {
   start: "items-start justify-start text-left",
   center: "items-center justify-center text-center",
   end: "items-end justify-end text-right",
};

const textPositionClasses = {
   right: "flex-row",
   left: "flex-row-reverse",
   bottom: "flex-col",
};

function LogoInner({
   src = UNIVERSITY_LOGO_URL,
   alt = `${UNIVERSITY_NAME} logo`,
   title = UNIVERSITY_NAME,
   subtitle,
   showText = true,
   imageWidth = 44,
   imageHeight = 44,
   priority = false,
   textPosition = "right",
   align = "start",
   className,
   imageClassName,
   textClassName,
   titleClassName,
   subtitleClassName,
}: Omit<LogoProps, "href">) {
   return (
      <div
         className={cn(
            "inline-flex gap-3",
            textPositionClasses[textPosition],
            alignClasses[align],
            className,
         )}
      >
         <div className="shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-black/5 dark:ring-white/10">
            <Image
               src={src}
               alt={alt}
               width={imageWidth}
               height={imageHeight}
               priority={priority}
               className={cn("h-auto w-auto object-contain", imageClassName)}
            />
         </div>
         {showText && (
            <div className={cn("min-w-0", textClassName)}>
               <div className={cn("text-sm font-semibold leading-tight", titleClassName)}>{title}</div>
               {subtitle && (
                  <div className={cn("text-xs leading-tight opacity-70", subtitleClassName)}>{subtitle}</div>
               )}
            </div>
         )}
      </div>
   );
}

export default function Logo({ href, ...props }: LogoProps) {
   if (href) {
      return (
         <Link href={href} className="inline-flex">
            <LogoInner {...props} />
         </Link>
      );
   }

   return <LogoInner {...props} />;
}
