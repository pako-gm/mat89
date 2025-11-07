import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppVersion } from '@/types';
import { getAllVersions } from '@/lib/data';
import { History, Calendar, Package } from 'lucide-react';

interface VersionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VersionHistoryModal = ({ open, onOpenChange }: VersionHistoryModalProps) => {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open]);

  // Auto-scrolling effect
  useEffect(() => {
    if (open && contentRef.current && versions.length > 0) {
      // Start auto-scrolling after a short delay
      const startDelay = setTimeout(() => {
        startAutoScroll();
      }, 1000);

      return () => {
        clearTimeout(startDelay);
        stopAutoScroll();
      };
    }
  }, [open, versions]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await getAllVersions();
      setVersions(data);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAutoScroll = () => {
    if (!contentRef.current) return;

    const scrollContainer = contentRef.current;
    const scrollSpeed = 30; // pixels per second
    const scrollStep = 1;
    const stepInterval = 1000 / scrollSpeed;

    scrollIntervalRef.current = setInterval(() => {
      if (scrollContainer) {
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const currentScroll = scrollContainer.scrollTop;

        if (currentScroll >= maxScroll) {
          // Reset to top when reaching bottom
          scrollContainer.scrollTop = 0;
        } else {
          scrollContainer.scrollTop += scrollStep;
        }
      }
    }, stepInterval);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    stopAutoScroll();
  };

  const handleMouseLeave = () => {
    startAutoScroll();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-white">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <History className="h-6 w-6 text-[#91268F]" />
            Historial de Versiones
          </DialogTitle>
        </DialogHeader>

        <div
          ref={contentRef}
          className="px-6 py-4 overflow-y-auto max-h-[60vh]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#91268F]"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay versiones disponibles
            </div>
          ) : (
            <div className="space-y-6">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-5 transition-all ${
                    index === 0
                      ? 'bg-gradient-to-br from-purple-50 to-white border-[#91268F] shadow-md'
                      : 'bg-white border-gray-200 hover:border-[#91268F] hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          index === 0 ? 'bg-[#91268F] text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {version.versionName}
                          {index === 0 && (
                            <span className="ml-2 text-xs bg-[#91268F] text-white px-2 py-1 rounded-full">
                              ACTUAL
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">Versión {version.versionNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {formatDate(version.releaseDate)}
                    </div>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Cambios principales:</h4>
                    <ul className="space-y-1.5">
                      {version.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-[#91268F] mt-1">•</span>
                          <span className="flex-1">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            Pasa el ratón sobre el contenido para pausar el auto-scroll
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
