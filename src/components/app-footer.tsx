import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-16">
      <div className="container max-w-5xl py-8 space-y-6">
        {/* 면책 / 의료법 안내 */}
        <div className="rounded-lg border bg-background p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-2">서비스 안내</p>
          <p className="mb-2">
            본 플랫폼은 의료기관·의료인과 별개의 <strong>정보 제공 서비스</strong>로,
            의료법 제27조에서 금지하는 환자 알선·유인 행위를 수행하지 않습니다.
          </p>
          <ul className="space-y-1 list-disc list-inside">
            <li>표시된 견적 금액은 <strong>참고용 평균</strong>이며, 정확한 비용은 의료기관 상담 시 안내됩니다.</li>
            <li>모든 시술 결정은 본인 책임 하에 의료진과 충분한 상담 후 결정하시기 바랍니다.</li>
            <li>병원 정렬/노출 순서는 평점·리뷰 수 등 객관적 지표를 기준으로 하며, 광고성 노출은 별도 표기됩니다.</li>
            <li>환자 후기는 본인 동의를 받아 익명 처리하여 게시합니다.</li>
            <li>의료광고 사전심의 대상에 해당하는 컨텐츠는 관련 법령에 따라 처리됩니다.</li>
          </ul>
        </div>

        {/* 링크 / 회사 정보 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">서비스</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li><Link href="/clinics/search" className="hover:underline">병원 검색</Link></li>
              <li><Link href="/auth/register" className="hover:underline">회원가입</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">정책</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li><Link href="/terms" className="hover:underline">이용약관</Link></li>
              <li><Link href="/privacy" className="hover:underline">개인정보처리방침</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">고객지원</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>support@denon.example</li>
              <li>운영 10:00 ~ 18:00 (주말 휴무)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">회사</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>치과 임플란트 중계 플랫폼</li>
              <li>사업자 등록: 000-00-00000</li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-4 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Denon. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
