import Logo from "./Logo";
const Footer = () => {
  return <footer className="bg-background border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8 items-start">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Logo size={56} />
              <span className="text-xl font-bold text-foreground">Corre Legal</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suporte jurídico especializado para motoristas de aplicativos e entregadores.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => {
                const element = document.getElementById("about");
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth"
                  });
                }
              }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Sobre Nós
                </button>
              </li>
              <li>
                <button onClick={() => {
                const element = document.getElementById("services");
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth"
                  });
                }
              }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Cobertura
                </button>
              </li>
              <li>
                <button onClick={() => {
                const element = document.getElementById("pricing");
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth"
                  });
                }
              }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contrate Agora
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4">Contato</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                Juripass Desenvolvimento de Software LTDA
              </p>
              <p>CNPJ: 35.911.772/0001-37</p>
              <p className="leading-relaxed">
                Alameda Rio Negro, 1030 - Sala 2304<br />
                Alphaville, Barueri - SP<br />
                CEP: 06454-000
              </p>
              <p className="pt-2">contato@correlegal.com.br</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Juripass. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;