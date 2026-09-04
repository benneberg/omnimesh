import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertTriangle, Home, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4 pt-12">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-rose-500 to-amber-500 rounded-3xl flex items-center justify-center shadow-glow">
              <ShieldAlert className="w-10 h-10 text-white drop-shadow-lg" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent tracking-tight">
                404
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                Page Not Found
              </p>
              <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
                The requested control plane route doesn't exist. OmniSign keeps screens running.
              </p>
            </div>
          </CardHeader>
          <CardContent className="pb-12">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-primary font-bold rounded-xl h-14">
                <Link to="/">
                  <Home className="mr-2 h-5 w-5" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="flex-1 font-bold rounded-xl h-14">
                Fleet Monitor
              </Button>
            </div>
            <div className="mt-8 pt-8 border-t border-dashed border-muted text-xs text-center text-muted-foreground font-mono uppercase tracking-wider">
              <div>ERROR_CODE: ROUTE_404_MESH</div>
              <div className="text-[10px] mt-1 opacity-75">Always-On Execution Guaranteed</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}