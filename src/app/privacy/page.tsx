export const metadata = { title: "개인정보처리방침 | Denon" };

export default function PrivacyPage() {
  return (
    <main className="container max-w-3xl py-10 prose prose-sm">
      <h1>개인정보처리방침</h1>
      <p className="text-muted-foreground">시행일: 2026-05-19</p>

      <h2>1. 수집하는 개인정보 항목</h2>
      <ul>
        <li>
          <strong>회원가입 시</strong>: 이메일, 비밀번호(암호화), 이름, 휴대폰 번호
        </li>
        <li>
          <strong>환자 추가</strong>: 생년월일, 성별, 주소(시/도/구/동), 건강보험 가입 여부
        </li>
        <li>
          <strong>치과의사 추가</strong>: 면허번호, 전문 분야, 경력
        </li>
        <li>
          <strong>견적 요청 (민감정보)</strong>: 치아 위치, 증상, 이전 치료 이력, 구강 사진
        </li>
        <li>
          <strong>이용 기록</strong>: 접속 IP, 쿠키, 서비스 이용 로그
        </li>
      </ul>

      <h2>2. 수집·이용 목적</h2>
      <ul>
        <li>회원 식별 및 본인 확인</li>
        <li>견적 요청을 익명화하여 의료기관에 전달 (사진은 의료기관 회신용으로만 사용)</li>
        <li>상담·예약·리뷰 기능 제공</li>
        <li>고객 문의 응대 및 서비스 안내</li>
      </ul>

      <h2>3. 보유 및 이용 기간</h2>
      <ul>
        <li>회원 탈퇴 시 즉시 파기 (단, 관계 법령에 따른 보존 의무 시 해당 기간 보관)</li>
        <li>견적 요청 기록: 분쟁 처리 목적 3년 보관</li>
        <li>상담·결제 관련 기록: 전자상거래법에 따라 5년 보관</li>
      </ul>

      <h2>4. 제3자 제공</h2>
      <ul>
        <li>견적 요청 내용은 익명화 후 견적 요청 대상 의료기관에만 제공됩니다.</li>
        <li>법령에 의거하거나 본인 동의가 있는 경우 외에는 외부에 제공하지 않습니다.</li>
      </ul>

      <h2>5. 처리위탁</h2>
      <ul>
        <li>AWS S3 (사진 저장)</li>
        <li>Vercel (서비스 호스팅)</li>
        <li>Gmail SMTP (이메일 발송)</li>
      </ul>

      <h2>6. 정보주체의 권리</h2>
      <p>
        이용자는 언제든지 본인의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다.
        문의: support@denon.example
      </p>

      <h2>7. 개인정보 보호 책임자</h2>
      <p>개인정보 관련 문의는 support@denon.example 으로 연락해주세요.</p>
    </main>
  );
}
