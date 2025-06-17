"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Coffee, ExternalLink, Github, Heart } from "lucide-react";

export function SponsorLinks()
{
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-100"
        >
          <Heart className="h-[1.2rem] w-[1.2rem] text-pink-500" />
          <span className="sr-only">Support the project</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Support LUTForge AI</p>
          <p className="text-xs text-muted-foreground">Help keep this project free!</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            href="https://github.com/sponsors/veedy-dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-full"
          >
            <Heart className="mr-2 h-4 w-4 text-pink-500" />
            <span>GitHub Sponsors</span>
            <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            href="https://ko-fi.com/veedygraph"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-full"
          >
            <Coffee className="mr-2 h-4 w-4 text-orange-500" />
            <span>Buy me a coffee</span>
            <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            href="https://github.com/yourusername/lutforge-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-full"
          >
            <Github className="mr-2 h-4 w-4" />
            <span>View on GitHub</span>
            <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
