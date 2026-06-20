import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { ScrollText } from "lucide-react"

interface ChangelogEntry {
  category: string
  items: string[]
}

interface VersionEntry {
  version: string
  date: string
  entries: ChangelogEntry[]
}

const CHANGELOG: VersionEntry[] = [
  {
    version: "v1.1.0",
    date: "Current",
    entries: [
      {
        category: "Added",
        items: [
          "Guides and rulers for precise field alignment",
          "Field lock to prevent accidental edits",
          "Field visibility toggle",
          "Multi-select and bulk editing",
          "Drag-and-drop fields from CSV sidebar to canvas",
          "Poppins font support",
          "Lazy imports for reduced bundle size",
          "ViteTest with basic smoke test",
          "Enter-key submit for color picker",
          "Pre-commit hooks and commit message linting",
          "Prettier for consistent formatting",
          "EditorConfig for IDE settings",
          "CI workflows with CodeQL and Dependabot",
        ],
      },
      {
        category: "Changed",
        items: ["Snap and ruler toggles hidden in preview mode"],
      },
      {
        category: "Fixed",
        items: [
          "Preview font props now sync with PDF export",
          "Glyph embedding size optimized to save space",
        ],
      },
      {
        category: "Style",
        items: [
          "Role badge color updated for clarity",
          "Field selected border color updated",
        ],
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-06-07",
    entries: [
      {
        category: "Added",
        items: ["GitHub Pages deploy workflow"],
      },
      {
        category: "Fixed",
        items: [
          "Asset paths use BASE_URL for favicon and PDF worker",
          "Font paths relative for deployment",
        ],
      },
      {
        category: "Docs",
        items: ["Improved README"],
      },
    ],
  },
  {
    version: "v0.9.0",
    date: "2026-06-07",
    entries: [
      {
        category: "Docs",
        items: ["Added GNU GPL v3 license"],
      },
      {
        category: "Misc",
        items: ["Ko-fi donation link"],
      },
    ],
  },
  {
    version: "v0.8.0",
    date: "2026-06-07",
    entries: [
      {
        category: "Added",
        items: ["Mobile block overlay for unsupported screen sizes"],
      },
    ],
  },
  {
    version: "v0.7.0",
    date: "2026-06-07",
    entries: [
      {
        category: "Added",
        items: ["Dev info modal with contributor profiles"],
      },
    ],
  },
  {
    version: "v0.6.0",
    date: "2026-06-07",
    entries: [
      {
        category: "Added",
        items: [
          "Google Fonts for wider font selection",
          "Fontkit for embedded font rendering in PDF export",
          "System fonts and condensed variants",
        ],
      },
      {
        category: "Changed",
        items: ["Preview coordinates now match export coordinates"],
      },
      {
        category: "Fixed",
        items: ["Preview coordinate calibration"],
      },
    ],
  },
  {
    version: "v0.5.0",
    date: "2026-06-07",
    entries: [
      {
        category: "Added",
        items: [
          "PWA support for offline install",
          "SEO meta tags",
          "Custom favicon matching brand",
        ],
      },
      {
        category: "Changed",
        items: [
          "Brand name updated to PDF Merger",
          "Icon updated to match branding",
        ],
      },
    ],
  },
  {
    version: "v0.4.0",
    date: "2026-06-07",
    entries: [
      {
        category: "Added",
        items: [
          "react-pdf for canvas rendering",
          "Improved field overlay UI",
          "Skeleton loader during PDF render",
        ],
      },
      {
        category: "Changed",
        items: ["Coordinate translation adjusted to match preview"],
      },
      {
        category: "Fixed",
        items: ["Memoized copy for export bug"],
      },
    ],
  },
  {
    version: "v0.3.0",
    date: "2026-06-06",
    entries: [
      {
        category: "Added",
        items: [
          "PDF and CSV upload with drag-and-drop",
          "Visual field placement on PDF canvas",
          "Per-field typography (font, size, bold, italic, color)",
          "Undo/redo support",
          "Keyboard shortcuts dialog",
          "Dark and light theme toggle",
          "Combined PDF and ZIP export",
          "Field layer ordering (bring to front, send to back)",
          "Drag-to-reorder fields in sidebar",
        ],
      },
    ],
  },
]

interface ChangelogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="size-4" />
            Changelog
          </DialogTitle>
          <DialogDescription>What's new in PDF Merger.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto -mx-4 px-4 pb-2">
          <Accordion type="multiple" defaultValue={["v1.1.0"]}>
            {CHANGELOG.map((version) => (
              <AccordionItem key={version.version} value={version.version}>
                <AccordionTrigger className="px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{version.version}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {version.date}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3 px-1">
                    {version.entries.map((group) => (
                      <div key={group.category}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          {group.category}
                        </p>
                        <ul className="flex flex-col gap-1">
                          {group.items.map((item) => (
                            <li
                              key={item}
                              className="text-sm text-foreground/80 leading-normal pl-3 relative before:content-['–'] before:absolute before:left-0 before:text-muted-foreground"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  )
}
