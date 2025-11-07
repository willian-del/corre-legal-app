import Logo from "./Logo";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Logo size={56} />
              <span className="text-xl font-bold text-foreground">Corre Legal</span>
            </div>
            <p className="text-muted-foreground">
              Suporte jurídico especializado para motoristas de aplicativos e entregadores.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    const element = document.getElementById("about");
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Sobre Nós
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    const element = document.getElementById("services");
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Cobertura
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    const element = document.getElementById("pricing");
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Contrate Agora
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-3">Empresa</h3>
            <div className="space-y-1.5 text-muted-foreground text-xs">
              <p className="font-semibold text-foreground text-sm">Juripass Desenvolvimento de Software LTDA</p>
              <p>CNPJ: 35.911.772/0001-37</p>
              <p className="leading-relaxed">
                Alameda Rio Negro, 1030 - Sala 2304<br />
                Alphaville, Barueri - SP - CEP: 06454-000
              </p>
              <p className="pt-1">contato@correlegal.com.br</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-center text-muted-foreground">
          <p className="text-xs">
            &copy; {new Date().getFullYear()} Juripass. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
