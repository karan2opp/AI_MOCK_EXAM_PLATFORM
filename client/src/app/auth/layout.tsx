import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left side (branding) */}
      <div className="hidden w-1/2 bg-background lg:flex flex-col justify-center px-12 xl:px-24 border-r border-border relative overflow-hidden">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shadow-lg">
              <div className="w-4 h-4 border-2 border-white rounded-sm" />
            </div>
            <span className="text-xl font-bold text-foreground">Platform</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-extrabold text-foreground mb-6 leading-tight">
            The gold standard in <span className="text-primary">academic integrity.</span>
          </h1>
          
          <p className="text-muted-foreground text-lg mb-12 leading-relaxed">
            Secure, sophisticated, and seamless assessment management designed for high-stakes environments.
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-secondary border-2 border-background" />
              <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-background" />
              <div className="w-8 h-8 rounded-full bg-primary border-2 border-background" />
            </div>
            <span className="font-medium">Trusted by 500+ Institutions worldwide</span>
          </div>
        </div>
      </div>
      
      {/* Right side (form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
