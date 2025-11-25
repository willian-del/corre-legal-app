import Logo from "./Logo";
import { Instagram, Youtube } from "lucide-react";
const TikTokIcon = ({
  size = 24,
  className = ""
}: {
  size?: number;
  className?: string;
}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>;
const Footer = () => {
  return <footer className="bg-background border-t border-border py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Redes sociais */}
          <div className="flex items-center gap-4">
            <a href="https://instagram.com/correlegal" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 hover:-translate-y-1" aria-label="Instagram">
              <Instagram size={16} />
            </a>
            <a href="https://tiktok.com/@correlegal.app" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 hover:-translate-y-1" aria-label="TikTok">
              <TikTokIcon size={16} />
            </a>
            <a href="https://youtube.com/@correlegal" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 hover:-translate-y-1" aria-label="YouTube">
              <Youtube size={16} />
            </a>
          </div>

          {/* Informações da empresa */}
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p className="text-foreground">
              Juripass Desenvolvimento de Software LTDA
            </p>
            <p>CNPJ: 35.911.772/0001-37</p>
            <p>Alphaville, Barueri - SP</p>
            <p>contato@correlegal.com.br</p>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Juripass. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;