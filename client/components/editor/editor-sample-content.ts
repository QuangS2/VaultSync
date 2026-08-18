/**
 * Default Rich Sample Documents for VaultSync Workspace
 * Pre-populated structured content demonstrating Headings, Blockquotes, CodeBlocks, and TaskLists.
 */

export const SAMPLE_DOCUMENTS: Record<string, string> = {
  'doc-welcome': `
    <h1>Chào mừng đến VaultSync</h1>
    <p>
      <strong>VaultSync</strong> là không gian làm việc cộng tác thời gian thực chuẩn doanh nghiệp, được bảo vệ bởi kiến trúc <em>Mã hóa Đầu-Cuối (End-to-End Encryption / Zero-Knowledge)</em> kết hợp cấu trúc dữ liệu phân tán <strong>CRDTs (Yjs)</strong>.
    </p>
    
    <blockquote>
      Mô hình Bảo mật Zero-Knowledge: Máy chủ backend đóng vai trò là một Người đưa thư mù (Blind Relay), chỉ chuyển tiếp các gói tin nhị phân mã hóa mà hoàn toàn không thể giải mã hay đọc trộm dữ liệu người dùng.
    </blockquote>

    <h2>1. Danh Sách Nhiệm Vụ Đang Thực Thi (WBS Checklist)</h2>
    <ul data-type="taskList" class="vaultsync-task-list">
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Task 0.1: Cấu trúc Monorepo &amp; Strict TypeScript 100% (Đã nghiệm thu)</p></div></li>
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Task 0.2: Core Layout Shell 3 Vùng &amp; Hệ Thống 3 Theme (Sun / Cloud / Night)</p></div></li>
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Task 1.1 - 1.3: Động Cơ Mật Mã WebCrypto AES-256-GCM &amp; Encrypted IndexedDB</p></div></li>
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Task 2.1 - 2.3: Quản Lý Cây Thư Mục &amp; Menu Ngữ Cảnh Chuột Phải</p></div></li>
      <li data-type="taskItem" data-checked="false" class="vaultsync-task-item"><label><input type="checkbox"><span></span></label><div><p>Task 3.1: Tích hợp Tiptap Core, TaskList &amp; CodeBlockLowlight Đa Ngôn Ngữ</p></div></li>
    </ul>

    <h2>2. Minh Họa Khối Mã Nguồn TypeScript (Code Block)</h2>
    <pre><code class="language-typescript">// VaultSync Zero-Knowledge Monotonic IV Generator
export function generateMonotonicIV(clientId: number, epoch: number, counter: bigint): Uint8Array {
  const iv = new Uint8Array(12); // 96-bit standard AES-GCM IV
  const view = new DataView(iv.buffer);
  
  view.setUint32(0, clientId, false); // 32-bit Client ID
  view.setUint16(4, epoch, false);    // 16-bit Epoch
  
  const highCounter = Number(counter >> 32n);
  const lowCounter = Number(counter & 0xFFFFFFFFn);
  view.setUint16(6, highCounter, false);
  view.setUint32(8, lowCounter, false);
  
  return iv;
}</code></pre>
  `,

  'doc-yjs-principles': `
    <h1>Nguyên lý Yjs &amp; CRDTs trong VaultSync</h1>
    <p>
      <strong>Yjs</strong> là thư viện CRDTs (Conflict-free Replicated Data Types) hiệu năng cao nhất hiện nay, cung cấp khả năng giải quyết xung đột tự động hội tụ mà không cần máy chủ trung tâm điều phối.
    </p>

    <h2>1. Điểm Neo Bất Biến (Relative Positions)</h2>
    <p>
      Điểm neo không lưu chỉ số tuyệt đối cố định mà gắn trực tiếp vào tọa độ <code>Item ID(client, clock)</code> trong đồ thị CRDT.
    </p>

    <pre><code class="language-typescript">import * as Y from 'yjs';

// Tạo cặp Relative Position cho vùng chọn văn bản
const yDoc = new Y.Doc();
const yType = yDoc.getText('content');
const startRel = Y.createRelativePositionFromTypeIndex(yType, 10, -1);
const endRel = Y.createRelativePositionFromTypeIndex(yType, 25, 0);

// Giải mã lại vị trí tuyệt đối chính xác ngay cả khi văn bản bị chèn/xóa phía trên
const absolutePos = Y.createAbsolutePositionFromRelativePosition(startRel, yDoc);</code></pre>
  `,

  'doc-zk-storage': `
    <h1>Bộ nhớ cục bộ IndexedDB E2EE</h1>
    <p>
      Dữ liệu trên trình duyệt người dùng được lưu trữ trong <strong>IndexedDB</strong> dưới dạng nhị phân đã mã hóa hoàn toàn bằng AES-256-GCM.
    </p>

    <h2>Quy Trình Lưu Trữ Offline-First:</h2>
    <ol>
      <li>Người dùng chỉnh sửa tài liệu hoặc thay đổi cấu trúc cây.</li>
      <li>Yjs sinh ra gói tin cập nhật vi sai (Update binary).</li>
      <li><code>WebCryptoEngine</code> mã hóa gói tin bằng khóa tài liệu (DEK).</li>
      <li>Ghi gói tin nhị phân vào Object Store <code>vaultsync-encrypted-chunks</code>.</li>
    </ol>
  `,

  'doc-aes-gcm-spec': `
    <h1>Đặc tả AES-256-GCM + AAD</h1>
    <p>
      Đặc tả kỹ thuật chuẩn mật mã học cho mọi gói tin trao đổi trong hệ thống VaultSync theo tiêu chuẩn NIST SP 800-38D.
    </p>

    <pre><code class="language-sql">-- Cấu trúc lưu trữ Metadata trên máy chủ Blind Relay
CREATE TABLE document_envelopes (
    document_id VARCHAR(64) PRIMARY KEY,
    owner_public_key TEXT NOT NULL,
    encrypted_dek_envelope BYTEA NOT NULL,
    epoch INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);</code></pre>
  `
};
