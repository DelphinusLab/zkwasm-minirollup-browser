import React from "react";

const Footer = () => {
  return (
    <footer className="border-t-2 border-border bg-background mt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div className="space-y-4 flex flex-col items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="text-xl font-bold text-gradient-primary">ZKWASM</div>
              <div className="text-lg font-mono text-accent">Staking</div>
            </div>
            <p className="font-mono text-sm text-muted-foreground text-center">
              Decentralized ZKWASM staking and rewards platform
            </p>
          </div>

          {/* Disclaimer */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-full">
              <h3 className="font-mono font-semibold text-primary uppercase tracking-wider mb-2 text-center">Disclaimer</h3>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
              ZKWASM is a decentralized infrastructure provider and does not offer financial products. This is a third-party application submitted by the community. ZKWASM does not operate or endorse any staking or earning applications listed on this site. Users are solely responsible for interacting with any applications or smart contracts, and ZKWASM assumes no liability for any financial loss. Please use at your own discretion.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="font-mono text-sm text-muted-foreground">
            © 2025 ZKWASM Staking Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 