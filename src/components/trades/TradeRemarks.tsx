import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TradeRemark, TradeImage } from '@/lib/types/trade'
import { tradeService } from '@/lib/services/tradeService'
import { useToast } from '@/components/ui/use-toast'
import Image from 'next/image'

interface TradeRemarksProps {
  tradeId: string
  initialRemarks?: TradeRemark[]
  initialImages?: TradeImage[]
  onUpdate: () => void
}

export function TradeRemarks({ tradeId, initialRemarks = [], initialImages = [], onUpdate }: TradeRemarksProps) {
  const [newRemark, setNewRemark] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const { toast } = useToast()

  const handleAddRemark = async () => {
    try {
      await tradeService.addTradeRemark(tradeId, newRemark)
      setNewRemark('')
      onUpdate()
      toast({
        title: 'Remark added',
        description: 'Your remark has been added successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add remark. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleAddImage = async () => {
    try {
      await tradeService.addTradeImage(tradeId, imageUrl, imageCaption)
      setImageUrl('')
      setImageCaption('')
      onUpdate()
      toast({
        title: 'Image added',
        description: 'Your image has been added successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add image. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a new remark..."
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
              />
              <Button onClick={handleAddRemark} disabled={!newRemark}>
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {initialRemarks.map((remark) => (
                <div key={remark.id} className="p-2 bg-muted rounded-md">
                  <p className="text-sm">{remark.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(remark.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Input
                placeholder="Caption (optional)"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
              />
              <Button onClick={handleAddImage} disabled={!imageUrl}>
                Add Image
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {initialImages.map((image) => (
                <div key={image.id} className="space-y-2">
                  <div className="relative aspect-video">
                    <Image
                      src={image.url}
                      alt={image.caption || 'Trade image'}
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>
                  {image.caption && (
                    <p className="text-sm text-muted-foreground">{image.caption}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(image.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 