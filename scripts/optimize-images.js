import imagemin from "imagemin";
import mozjpeg from "imagemin-mozjpeg";
import pngquant from "imagemin-pngquant";

(async () => {
   const files = process.argv.slice(2);
   if (!files.length) return;

   // Process one file at a time
   for (const file of files) {
      await imagemin([file], {
         destination: file.substring(0, file.lastIndexOf('\\')), // Save in same directory
         plugins: [
            mozjpeg({
               quality: 70
            }),
            pngquant({
               quality: [0.6, 0.8]
            }),
         ],
      });
      console.log(`✅ Optimized: ${file}`);
   }

   console.log("All images optimized");
})();
