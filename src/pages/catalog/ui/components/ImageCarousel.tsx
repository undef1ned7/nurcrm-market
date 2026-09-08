import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  fallback: string;
  /** Класс, задающий размеры/object-fit картинки (переиспользуем sfcard__img / sfmodal__img). */
  imgClassName?: string;
  intervalMs?: number;
}

const handleImgError =
  (fallback: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
  };

/** Автослайдер фото товара (Swiper): смена по таймеру + точки для ручного переключения. */
export function ImageCarousel({
  images,
  alt,
  fallback,
  imgClassName,
  intervalMs = 3200,
}: ImageCarouselProps) {
  const list = images.length > 0 ? images : [fallback];

  if (list.length <= 1) {
    return (
      <img
        className={imgClassName}
        src={list[0]}
        alt={alt}
        loading="lazy"
        onError={handleImgError(fallback)}
      />
    );
  }

  return (
    <Swiper
      className="img-carousel"
      modules={[Autoplay, Pagination]}
      autoplay={{
        delay: intervalMs,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      }}
      pagination={{ clickable: true }}
      loop
      speed={500}
      slidesPerView={1}
    >
      {list.map((src, i) => (
        <SwiperSlide key={`${src}-${i}`}>
          <img
            className={imgClassName}
            src={src}
            alt={i === 0 ? alt : `${alt} — фото ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            onError={handleImgError(fallback)}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
