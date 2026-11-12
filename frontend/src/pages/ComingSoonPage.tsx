import { Card, Tag } from 'antd'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

/**
 * Trang giữ chỗ cho chức năng chưa triển khai. Cố ý KHÔNG hiển thị dữ liệu giả (quy tắc dự án):
 * nói rõ chức năng sẽ có ở mốc nào.
 */
export function ComingSoonPage({ title, milestone }: { title: string; milestone?: number }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          title="Chức năng đang được phát triển"
          description={
            <>
              Màn hình này sẽ được kết nối API thật {milestone ? <>ở <Tag className="mx-0.5">Mốc {milestone}</Tag></> : 'ở mốc sau'}. Xem tiến độ
              trong PROJECT_STATUS.md.
            </>
          }
        />
      </Card>
    </>
  )
}
