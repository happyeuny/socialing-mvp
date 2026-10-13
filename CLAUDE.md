@AGENTS.md

## Claude Code 메모
- 클라우드 세션에는 Docker가 없다. 환경 변수는 클라우드 환경 설정에서 들어오며 값은 출력하지 않는다.
- 프로젝트 공유 폴더(`/mnt/project-files`)의 기획 원본은 참고용이다. 기준은 이 저장소의 `docs/`와 `DESIGN.md`다.
- Figma 커넥터는 무료 요금제에서 읽기 한 달 20회까지라, 시안은 `docs/design/screens/` PNG를 먼저 본다. **Figma를 읽기 전에는 PM에게 어떤 화면을 왜 몇 번 읽을지 말하고 승인을 받는다.** 승인되면 `docs/design/screens/README.md`의 node id로 그 화면만 `get_screenshot` 한 번 읽는다. 페이지 전체 메타데이터는 읽지 않는다.
