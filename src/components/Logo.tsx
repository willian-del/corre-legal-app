import logoImage from "@/assets/logo.png";
import { useDehaloImage } from "@/hooks/useDehaloImage";

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo = ({ size = 40, className = "" }: LogoProps) => {
  const fixed = useDehaloImage(logoImage);
  const src = fixed ?? logoImage;

  return (
    <img 
      src={src} 
      alt="Corre Legal" 
      width={size} 
      height={size}
      decoding="async"
      loading="eager"
      className={className}
    />
  );
};

export default Logo;
